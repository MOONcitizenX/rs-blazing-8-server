import { randomUUID } from 'crypto';
import { pick, shuffle } from 'lodash';
import { RemoteSocket, Server } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Card, cardsMap } from 'src/data/cardsMap';
import { ServerToClientEvents } from 'src/gateway/socketTypes/ServerToClientEvents';

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
  private timer: NodeJS.Timer | null = null;
  timerCount = 30;
  private server!: Server<ServerToClientEvents>;

  roomId: string;
  status: RoomStatus;
  direction: 'CW' | 'ACW';
  playerTurn: string;
  isCurrentPlayerDraw = false;
  isCurrentPlayerPass = false;
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

  startNewGame(server: Server<ServerToClientEvents>) {
    if (
      this.players.length >= this.minPlayers &&
      this.players.length <= this.maxPlayers
    ) {
      this.server = server;
      const cards = Object.keys(cardsMap);
      const shuffledCards = shuffle(cards);
      this.closedDeck = shuffledCards;
      this.players.forEach((player) => {
        player.cards = this.closedDeck.splice(-5, 5);
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
      this.startOrResetTimer();

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
    if (!this.isCurrentPlayerDraw) {
      const card = this.closedDeck.pop();
      if (card) {
        const player = this.findUserById(userId);
        if (player) {
          player.cards.push(card);
        }
        this.isCurrentPlayerDraw = true;
        return card;
      }
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
    this.openDeck.unshift(this.topCard);
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
      (pl) => pl.id === player.id,
    );
    let nextPlayer;
    if (this.direction === 'CW') {
      if (currentPlayerIndex === this.players.length - 1) {
        nextPlayer = this.players[0];
      } else {
        nextPlayer = this.players[currentPlayerIndex + 1];
      }
    } else if (currentPlayerIndex === 0) {
      nextPlayer = this.players[this.players.length - 1];
    } else {
      nextPlayer = this.players[currentPlayerIndex - 1];
    }
    this.openDeck.unshift(card.cardId);
    this.removeCardFromHand(card, player);

    this.swapCards(
      currentPlayerIndex,
      this.players.findIndex((pl) => pl.id === nextPlayer.id),
    );
    const response = {
      playerId: player.id,
      nextPlayerId: nextPlayer.id,
      playerCards: player.cards,
      nextPlayerCards: nextPlayer.cards,
    };
    return response;
  }

  swapCards(player1index, player2index) {
    [this.players[player1index].cards, this.players[player2index].cards] = [
      this.players[player2index].cards,
      this.players[player1index].cards,
    ];
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
      this.isCurrentPlayerDraw = false;
      this.startOrResetTimer();
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

  async startOrResetTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.timerCount = 30;
    }
    const sockets = await this.server.in(this.roomId).fetchSockets();
    this.timer = setInterval(() => {
      if (this.timerCount <= 0) {
        sockets.forEach((socket) => {
          socket.emit('timer-update', {
            id: this.playerTurn,
            timerCount: this.timerCount,
          });
        });
        if (this.isCurrentPlayerDraw) {
          this.drawCard(this.playerTurn);
        }
        this.movePlayerTurn();
      }
      this.timerCount -= 1;
    }, 1000);
    sockets.forEach((socket) => {
      socket.emit('timer-update', {
        id: this.playerTurn,
        timerCount: this.timerCount,
      });
    });
  }

  sendPersonalStates(
    this: Room,
    sockets: RemoteSocket<DefaultEventsMap, any>[],
  ) {
    sockets.forEach((socket) => {
      socket.emit('room-state', this.getUserState(socket.data.userId));
    });
  }
}
