import { randomUUID } from 'crypto';
import { cards } from 'src/data/cards';
import { pick, shuffle } from 'lodash';

export type RoomStatus = 'lobby' | 'playing';

export class Room {
  private closedDeck: string[] = [];
  private openDeck: string[] = [];
  private maxPlayers = 5;

  roomId: string;
  status: RoomStatus;
  winner: string;
  players: [
    {
      id: string;
      name: string;
      avatarId: string;
      online: boolean;
      cards: string[];
    },
  ];

  constructor(userId: string, userName: string, avatarId: string) {
    const roomId = randomUUID();
    this.roomId = roomId;
    this.status = 'lobby';
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
  }

  startNewGame() {
    const shuffledCards = shuffle(cards);
    this.closedDeck = shuffledCards;
    this.players.forEach(
      (player) => (player.cards = this.closedDeck.splice(-5, 5)),
    );
    this.openDeck = [];
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
      'closedDeck',
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
}
