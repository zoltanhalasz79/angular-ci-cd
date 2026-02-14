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
  getCountFromServer,
  firestoreInstance$ // Add this import
} from '@angular/fire/firestore';
import { 
  Auth, 
  user, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from '@angular/fire/auth';
import { switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  private readonly auth = inject(Auth);
  
  user$ = user(this.auth);
  messages = signal<any[]>([]);
  msgCountToday = signal(0);
  limitReached = signal(false);

  ngOnInit() {
    // This approach ensures we ONLY query once the firestore instance is fully "ready"
    firestoreInstance$.pipe(
      switchMap(instance => {
        const msgCollection = collection(instance, 'messages');
        const q = query(msgCollection, orderBy('timestamp', 'desc'));
        return collectionData(q, { idField: 'id' });
      })
    ).subscribe({
      next: (data) => this.messages.set(data),
      error: (err) => console.error("Final Firestore Error:", err)
    });

    this.user$.subscribe(u => {
      if (u) this.checkDailyLimit(u.uid);
    });
  }

  async sendMessage(text: string) {
    if (this.limitReached() || !text.trim()) return;

    // Get the instance explicitly for the write operation
    const instance = await firestoreInstance$.pipe(take(1)).toPromise();
    const currentUser = this.auth.currentUser;

    if (instance && currentUser) {
      await addDoc(collection(instance, 'messages'), {
        messageText: text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        timestamp: serverTimestamp()
      });
      this.checkDailyLimit(currentUser.uid);
    }
  }

  async checkDailyLimit(userId: string) {
    const instance = await firestoreInstance$.pipe(take(1)).toPromise();
    if (!instance) return;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(
      collection(instance, 'messages'),
      where('senderId', '==', userId),
      where('timestamp', '>=', startOfToday)
    );

    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;
    this.msgCountToday.set(count);
    this.limitReached.set(count >= 3);
  }

  async login() {
    await signInWithPopup(this.auth, new GoogleAuthProvider());
  }

  async logout() {
    await signOut(this.auth);
  }
}