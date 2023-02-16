export interface ClientToServerEvents {
  'create-room': () => {
    userName: string;
    avatarId: string;
  };

  'join-room': () => {
    roomId: string;
    userName: string;
    avatarId: string;
  };

  'leave-room': () => void;

  'start-game': () => void;

  'draw-card': () => void;

  'play-card': () => { card: string };

  'choose-color': () => void;

  'pass-turn': () => void;

  'add-chat-message': () => {
    message: string;
  };
}
