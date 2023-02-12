import { randomUUID } from 'crypto';
import { cards } from 'src/data/cards';
import { pick, shuffle } from 'lodash';
import { Card, cardsMap } from 'src/data/cardsMap';

export type RoomStatus = 'lobby' | 'playing';

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  online: boolean;
  cards: string[];
}

export class Room {
  private closedDeck: string[] = [];
  private openDeck: string[] = [];
  private topCard: Card | null;
  private maxPlayers = 5;

  roomId: string;
  status: RoomStatus;
  direction: 'CW' | 'ACW';
  playerTurn: string;
  winner: string;
  players: Player[];

  constructor(userId: string, userName: string, avatarId: string) {
    const roomId = randomUUID();
    this.openDeck = [];
    this.roomId = roomId;
    this.status = 'lobby';
    this.direction = 'CW';
    this.topCard = null;
    this.winner = '';
    this.players = [
      {
        id: userId,
        name: userName,
        avatarId,
        online: true,
        cards: [],
      },
    ];
    this.playerTurn = this.winner ?? this.players[0].id;
  }

  startNewGame() {
    const shuffledCards = shuffle(cards);
    this.closedDeck = shuffledCards;
    this.players.forEach(
      (player) => (player.cards = this.closedDeck.splice(-5, 5)),
    );
    const startCard = this.closedDeck.pop();
    if (startCard) {
      this.openDeck = [startCard];
      this.topCard = cardsMap[startCard];
    }
    this.status = 'playing';
  }

  finishGame(winnerId: string) {
    const winner = this.findUserById(winnerId)?.name;
    if (winner) {
      this.winner = winner;
    }
    this.status = 'lobby';
  }

  addNewPlayer({ userId, userName, avatarId }: Record<string, string>) {
    if (!this.findUserById(userId) && this.players.length <= this.maxPlayers) {
      this.players.push({
        id: userId,
        name: userName,
        avatarId,
        online: true,
        cards: [],
      });
      return this;
    }
    return null;
  }

  findUserById(userId: string) {
    return this.players.find((player) => player.id === userId);
  }

  getUserState(this: Room, userId: string) {
    const userRoomState = pick(
      this,
      'roomId',
      'status',
      'winner',
      'direction',
      'topCard',
      'playerTurn',
    );
    const players = this.players.map((player) =>
      player.id === userId
        ? player
        : {
            ...player,
            cards: player.cards.length,
          },
    );
    const closedDeck = this.closedDeck.length;
    return {
      ...userRoomState,
      players,
      closedDeck,
      roomId: this.roomId,
    };
  }

  drawCard(userId: string) {
    const card = this.closedDeck.pop();
    if (card) {
      const player = this.findUserById(userId);
      if (player) {
        player.cards.push(card);
      }
    }
    return null;
  }

  playCard(userId: string, cardName: string) {
    const player = this.findUserById(userId);
    const playerCard = cardsMap[cardName];
    const topCard = this.topCard;
    if (topCard && player && this.checkIsCardPlayable(playerCard, topCard)) {
      this.playCardOnBehavior(playerCard, player);
    }
  }

  checkIsCardPlayable(playerCard: Card, topCard: Card) {
    return (
      topCard &&
      (playerCard.value === topCard.value ||
        playerCard.color === topCard.color ||
        playerCard.value === '8' ||
        playerCard.value === 'swap')
    );
  }

  playCardOnBehavior(playerCard: Card, player: Player) {
    switch (playerCard.value) {
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '9':
      case '10':
      case 'A': {
        this.playRegularCard(playerCard, player);
        break;
      }
      case 'J': {
        this.playJack(playerCard, player);
        break;
      }
      case 'Q': {
        this.playQueen(playerCard, player);
        break;
      }
      case 'K': {
        this.playKing(playerCard, player);
        break;
      }
      case 'swap': {
        this.playSwap(playerCard, player);
        break;
      }
      default:
        this.movePlayerTurn();
    }
  }

  playRegularCard(card: Card, player: Player) {
    this.topCard = card;
    this.removeCard(card, player);
  }

  // TODO
  playEight(card: Card, player: Player) {
    this.removeCard(card, player);
    if (this.topCard) {
      this.topCard.color = card.color;
    } else {
      this.topCard = card;
    }
  }

  playJack(card: Card, player: Player) {
    this.playRegularCard(card, player);
    this.movePlayerTurn();
  }

  playQueen(card: Card, player: Player) {
    this.playRegularCard(card, player);
    this.direction = this.direction === 'CW' ? 'ACW' : 'CW';
  }

  playKing(card: Card, player: Player) {
    this.playRegularCard(card, player);
    const otherPlayers = this.players.filter((user) => user.id !== player.id);
    if (this.closedDeck.length <= this.players.length) {
      const cardsFromBottom = this.openDeck.splice(0, this.players.length);
      this.closedDeck.push(...cardsFromBottom);
    }
    otherPlayers.forEach((user) => this.drawCard(user.id));
  }

  playSwap(card: Card, player: Player) {
    this.removeCard(card, player);
    const currentPlayerIndex = this.players.findIndex(
      (player) => player.id === this.playerTurn,
    );
    let nextPlayer;
    if (this.direction === 'CW') {
      nextPlayer =
        currentPlayerIndex < this.players.length
          ? this.players[currentPlayerIndex + 1]
          : this.players[0];
    }
    if (this.direction === 'ACW') {
      nextPlayer =
        currentPlayerIndex === 0
          ? this.players[this.players.length - 1]
          : this.players[currentPlayerIndex - 1];
    }
    const tempCards = player.cards;
    player.cards = nextPlayer.cards;
    nextPlayer.cards = tempCards;
  }

  removeCard(playerCard: Card, player: Player) {
    const cardIndex = player.cards.findIndex(
      (card) =>
        cardsMap[card].value === playerCard.value &&
        cardsMap[card].color === playerCard.color,
    );
    player.cards.splice(cardIndex, 1);
  }

  movePlayerTurn() {
    const currentPlayerIndex = this.players.findIndex(
      (player) => player.id === this.playerTurn,
    );
    if (currentPlayerIndex) {
      if (this.direction === 'CW') {
        this.playerTurn =
          currentPlayerIndex < this.players.length
            ? this.players[currentPlayerIndex + 1].id
            : this.players[0].id;
      }
      if (this.direction === 'ACW') {
        this.playerTurn =
          currentPlayerIndex === 0
            ? this.players[this.players.length - 1].id
            : this.players[currentPlayerIndex - 1].id;
      }
    }
  }
}
