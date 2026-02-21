import { Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from './chat.service';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  // Inject the service
  chatService = inject(ChatService);

  // Reference the message board for scrolling
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('msgInput') private msgInput!: ElementRef;

  // When true the next automatic scroll will be suppressed. Used after login
  // so we can scroll to the most recent messages (top) instead of bottom.
  private skipNextAutoScroll = false;

  // Edit mode state
  editingMessageId: string | null = null;
  editingMessageText: string = '';

  // Color palette for users (in light and dark mode)
  private userColors = new Map<string, { dark: string; light: string }>();
  private colorPalette = [
    { dark: '#2563eb', light: '#0066cc' },  // Blue
    { dark: '#dc2626', light: '#cc0000' },  // Red
    { dark: '#059669', light: '#008000' },  // Green
    { dark: '#d97706', light: '#ff8c00' },  // Orange
    { dark: '#7c3aed', light: '#6600cc' },  // Purple
    { dark: '#0891b2', light: '#0088aa' },  // Cyan
    { dark: '#db2777', light: '#cc0066' },  // Pink
    { dark: '#ea580c', light: '#ff6600' },  // Orange-Red
  ];

  constructor() {
    // 🚀 Modern Auto-Scroll: Runs every time chatService.messages() changes
    effect(() => {
      // We just access the signal to register the dependency
      const _ = this.chatService.messages();
      // Schedule scroll after view updates
      setTimeout(() => {
        if (this.skipNextAutoScroll) {
          // consume the flag and don't auto-scroll to bottom
          this.skipNextAutoScroll = false;
          return;
        }
        this.scrollToBottom();
      }, 100);
    });
  }

  async login() {
    await this.chatService.login();
    // Prevent the automatic scroll-to-bottom that runs when messages update
    // so we can put the user's attention on the most recent messages (top).
    this.skipNextAutoScroll = true;
    this.scrollToTop();
  }

  logout() {
    this.chatService.logout();
  }

  sendMessage(text: string) {
    this.chatService.sendMessage(text);
  }

  deleteMessage(messageId: string) {
    this.chatService.deleteMessage(messageId);
    // Scroll to top to show most recent messages after deletion
    this.skipNextAutoScroll = true;
    this.scrollToTop();
  }

  startEdit(messageId: string, messageText: string) {
    this.editingMessageId = messageId;
    this.editingMessageText = messageText;
    // Focus the input field after the view updates
    setTimeout(() => {
      if (this.msgInput) {
        this.msgInput.nativeElement.focus();
        this.msgInput.nativeElement.select();
      }
    }, 0);
  }

  cancelEdit() {
    this.editingMessageId = null;
    this.editingMessageText = '';
    // Clear the input field
    if (this.msgInput) {
      this.msgInput.nativeElement.value = '';
    }
  }

  async saveEdit(newText: string) {
    if (!this.editingMessageId || !newText.trim()) return;

    const messageId = this.editingMessageId;
    // Clear state immediately so UI updates right away
    this.editingMessageId = null;
    this.editingMessageText = '';
    // Clear the input field
    if (this.msgInput) {
      this.msgInput.nativeElement.value = '';
    }

    // Update in Firestore after clearing the UI
    await this.chatService.updateMessage(messageId, newText.trim());
  }

  // Accepts Firestore Timestamp, number (ms), or ISO string and returns
  // a readable local string like "Feb 14, 2026 14:23".
  formatTimestamp(ts: any): string {
    if (!ts) return '';
    let d: Date;
    // Firestore Timestamp
    if (ts instanceof Timestamp) {
      d = ts.toDate();
    } else if (typeof ts === 'number') {
      d = new Date(ts);
    } else if (ts.seconds && typeof ts.seconds === 'number') {
      // Some Firestore representations come as { seconds, nanoseconds }
      d = new Date(ts.seconds * 1000);
    } else {
      d = new Date(ts);
    }

    if (isNaN(d.getTime())) return '';

    // Simple format: "MMM DD, YYYY HH:mm"
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    };
    return new Intl.DateTimeFormat(undefined, opts).format(d);
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  private scrollToTop(): void {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = 0;
    }
  }

  // Get consistent color for a user based on their ID
  getUserColor(userId: string): string {
    if (!this.userColors.has(userId)) {
      // Generate a hash from the user ID to determine which color to use
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash) + userId.charCodeAt(i);
        hash |= 0; // Convert to 32-bit integer
      }
      const colorIndex = Math.abs(hash) % this.colorPalette.length;
      this.userColors.set(userId, this.colorPalette[colorIndex]);
    }
    return this.userColors.get(userId)?.dark || '#2563eb';
  }

  // Get light mode color for a user
  getUserColorLight(userId: string): string {
    if (!this.userColors.has(userId)) {
      let hash = 0;
      for (let i = 0; i < userId.length; i++) {
        hash = ((hash << 5) - hash) + userId.charCodeAt(i);
        hash |= 0;
      }
      const colorIndex = Math.abs(hash) % this.colorPalette.length;
      this.userColors.set(userId, this.colorPalette[colorIndex]);
    }
    return this.userColors.get(userId)?.light || '#0066cc';
  }
}