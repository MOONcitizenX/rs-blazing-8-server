export interface ChatMessage {
  author: string;
  timeStamp: string;
  message: string;
}

export class Chat {
  private messages: ChatMessage[] = [];

  roomId: string;

  constructor(author: string, id: string) {
    this.roomId = id;
    this.addMessage(author);
  }

  addMessage(author: string, message = 'joined the game.') {
    const now = Date.now();
    const timeStamp = new Date(now).toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: 'numeric',
    });
    this.messages.push({
      author,
      timeStamp,
      message,
    });
  }

  get chat() {
    return this.messages;
  }
}
