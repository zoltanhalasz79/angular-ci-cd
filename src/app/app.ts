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
  // When true the next automatic scroll will be suppressed. Used after login
  // so we can scroll to the most recent messages (top) instead of bottom.
  private skipNextAutoScroll = false;

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
}