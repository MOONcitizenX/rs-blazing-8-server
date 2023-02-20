import { randomUUID } from 'crypto';
import { pick, shuffle } from 'lodash';
import { Card, cardsMap } from 'src/data/cardsMap';

export type RoomStatus = 'lobby' | 'playing';

export type RoomStateType = {
  roomId: string;
  status: string;
  direction: string;
  topCard: string | null;
  playerTurn: string;
  players: Player[];
  closedDeck: number | string[];
};

export interface Player {
  id: string;
  name: string;
  avatarId: string;
  online: boolean;
  cards: string[];
}

export class Room {
  closedDeck: Card['cardId'][] = [];
  private openDeck: Card['cardId'][] = [];
  topCard: Card['cardId'] | null;
  private maxPlayers = 5;
  private minPlayers = 2;

  roomId: string;
  status: RoomStatus;
  direction: 'CW' | 'ACW';
  playerTurn: string;
  private winner: string;
  private oneCardLeft: boolean;
  players: Player[];

  constructor(userId: string, userName: string, avatarId: string) {
    const roomId = randomUUID();
    this.openDeck = [];
    this.roomId = roomId;
    this.status = 'lobby';
    this.direction = 'CW';
    this.topCard = null;
    this.winner = '';
    this.oneCardLeft = false;
    this.players = [
      {
        id: userId,
        name: userName,
        avatarId,
        online: true,
        cards: [],
      },
    ];
    this.playerTurn = this.winner || this.players[0].id;
  }

  startNewGame() {
    if (
      this.players.length >= this.minPlayers &&
      this.players.length <= this.maxPlayers
    ) {
      const cards = Object.keys(cardsMap);
      const shuffledCards = shuffle(cards);
      this.closedDeck = shuffledCards;
      this.players[0].cards = ['SR', 'SG'];
      this.players.forEach((player, index) => {
        if (index !== 0) {
          player.cards = this.closedDeck.splice(-5, 5);
        }
      });
      const startCard = this.closedDeck.pop();
      if (startCard) {
        this.openDeck = [startCard];
        this.topCard = startCard;
      }
      const isWinnerInGame = this.players.find(
        (player) => player.id === this.winner,
      );
      this.oneCardLeft = false;
      this.playerTurn = isWinnerInGame ? this.winner : this.players[0].id;
      this.status = 'playing';
      this.direction = 'CW';

      return true;
    } else {
      return false;
    }
  }

  addNewPlayer({ userId, userName, avatarId }: Record<string, string>) {
    if (
      !this.findUserById(userId) &&
      this.players.length < this.maxPlayers &&
      this.status !== 'playing'
    ) {
      this.players.push({
        id: userId,
        name: userName,
        avatarId,
        online: true,
        cards: [],
      });
      return true;
    }
    return null;
  }

  convertToLobby() {
    this.status = 'lobby';
  }

  findUserById(userId: string) {
    return this.players.find((player) => player.id === userId);
  }

  getUserState(this: Room, userId: string) {
    const userRoomState = pick(
      this,
      'roomId',
      'status',
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
      return card;
    }
    return null;
  }

  playCard(userId: string, cardName: string) {
    const player = this.findUserById(userId);
    const playerCard = cardsMap[cardName];
    const topCard = this.topCard ? cardsMap[this.topCard] : null;
    if (topCard && player && this.checkIsCardPlayable(playerCard, topCard)) {
      this.playCardOnBehavior(playerCard, player);
      this.movePlayerTurn();
    }
    const winner = this.checkIsWinner();
    if (winner) {
      this.winner = winner.id;
    }
    const oneCardLeft = this.checkIsOneCardLeft();
    if (oneCardLeft) {
      this.oneCardLeft = true;
    }
    return { winner, oneCardLeft };
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
      // case 'swap': {
      //   this.playSwap(playerCard, player);
      //   break;
      // }
      case '8': {
        this.playRegularCard(playerCard, player);
        break;
      }
    }
  }

  playRegularCard(card: Card, player: Player) {
    this.topCard = card.cardId;
    this.openDeck.push(this.topCard);
    this.removeCardFromHand(card, player);
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
    const currentPlayerIndex = this.players.findIndex(
      (player) => player.id === this.playerTurn,
    );
    let nextPlayer = {} as Player;
    if (this.direction === 'CW') {
      nextPlayer =
        currentPlayerIndex === this.players.length - 1
          ? this.players[0]
          : this.players[currentPlayerIndex + 1];
    }
    if (this.direction === 'ACW') {
      nextPlayer =
        currentPlayerIndex === 0
          ? this.players[this.players.length - 1]
          : this.players[currentPlayerIndex - 1];
    }
    this.openDeck.push(card.cardId);
    this.removeCardFromHand(card, player);
    const tempCards = player.cards;
    player.cards = nextPlayer.cards;
    nextPlayer.cards = tempCards;

    return {
      playerId: player.id,
      nextPlayerId: nextPlayer.id,
      playerCards: player.cards,
      nextPlayerCards: nextPlayer.cards,
    };
  }

  removeCardFromHand(playerCard: Card, player: Player) {
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
    console.log(currentPlayerIndex);
    if (currentPlayerIndex !== undefined || currentPlayerIndex !== null) {
      if (this.direction === 'CW') {
        this.playerTurn =
          currentPlayerIndex < this.players.length - 1
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

  checkIsWinner() {
    const winner = this.players.find((player) => player.cards.length === 0);
    if (winner) {
      this.closedDeck = [];
      this.openDeck = [];
      this.status = 'lobby';
      this.direction = 'CW';
      this.topCard = null;
      this.winner = winner.id;
      this.oneCardLeft = false;
    }
    return winner;
  }

  checkIsOneCardLeft() {
    const oneCardLeft = this.players.find(
      (player) => player.cards.length === 1,
    );
    return oneCardLeft;
  }
}
