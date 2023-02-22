import { ChatMessage } from 'src/chatService/chatService';
import { Player, RoomStateType } from 'src/gameService/roomService';

export interface ServerToClientEvents {
  'room-state': (room: RoomStateType | null) => void;

  'choose-color': (isChooseColor: boolean) => void;

  'get-me': (myId: { id: string }) => void;

  'leave-success': () => void;

  'get-chat': (chat: ChatMessage[]) => void;

  'winner-winner': ({ winner }: { winner: Player['id'] | null }) => void;

  'one-card-left': (isOneCardLeft: boolean) => void;

  'swap-cards': ({
    playerId,
    nextPlayerId,
    playerCards,
    nextPlayerCards,
  }: {
    playerId: string;
    nextPlayerId: string;
    playerCards: string[] | number;
    nextPlayerCards: string[] | number;
  }) => void;

  'timer-update': ({
    id,
    timerCount,
  }: {
    id: string;
    timerCount: number;
  }) => void;

  'card-draw': ({ id }: { id: string }) => void;

  error: ({ message }: { message: string }, func?: () => void) => void;
}
