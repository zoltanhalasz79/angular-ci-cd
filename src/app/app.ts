import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  Firestore, 
  collection, 
  collectionData, 
  query, 
  orderBy, 
  where, 
  addDoc, 
  serverTimestamp, 
  getCountFromServer 
} from '@angular/fire/firestore';
import { 
  Auth, 
  user, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  // 1. Inject services as private readonly properties
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  
  // 2. State management
  user$ = user(this.auth) as Observable<any>;
  messages = signal<any[]>([]);
  msgCountToday = signal(0);
  limitReached = signal(false);

  ngOnInit() {
    // 3. Initialize data streams inside ngOnInit to ensure stable injection context
    this.loadMessages();
    
    this.user$.subscribe(u => {
      if (u) {
        this.checkDailyLimit(u.uid);
      } else {
        this.msgCountToday.set(0);
        this.limitReached.set(false);
      }
    });
  }

  private loadMessages() {
    // Explicitly use the injected firestore instance
    const msgCollection = collection(this.firestore, 'messages');
    const q = query(msgCollection, orderBy('timestamp', 'desc'));
    
    collectionData(q, { idField: 'id' }).subscribe({
      next: (data) => this.messages.set(data),
      error: (err) => console.error("Firestore Subscribe Error:", err)
    });
  }

  async login() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(this.auth, provider);
    } catch (err) {
      console.error("Login Failed:", err);
    }
  }

  async logout() {
    await signOut(this.auth);
  }

  async sendMessage(text: string) {
    if (this.limitReached() || !text.trim()) return;

    const currentUser = this.auth.currentUser;
    if (currentUser) {
      const msgCollection = collection(this.firestore, 'messages');
      await addDoc(msgCollection, {
        messageText: text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp()
      });
      // Refresh count after sending
      await this.checkDailyLimit(currentUser.uid);
    }
  }

  async checkDailyLimit(userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const msgCollection = collection(this.firestore, 'messages');
    const q = query(
      msgCollection,
      where('senderId', '==', userId),
      where('timestamp', '>=', startOfToday)
    );

    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;
    this.msgCountToday.set(count);
    this.limitReached.set(count >= 3);
  }
}