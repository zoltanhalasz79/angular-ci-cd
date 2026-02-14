import { Injectable, signal, computed } from '@angular/core';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
    getFirestore, collection, query, orderBy, where, onSnapshot,
    addDoc, serverTimestamp, getCountFromServer, Firestore, Timestamp, doc, deleteDoc
} from 'firebase/firestore';
import {
    getAuth, signInWithPopup, GoogleAuthProvider, signOut,
    onAuthStateChanged, Auth, User
} from 'firebase/auth';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private auth: Auth;
    private db: Firestore;

    // State Signals
    user = signal<User | null>(null);
    messages = signal<any[]>([]);
    msgCountToday = signal(0);

    // Computed Signal for Limit (Derived state)
    limitReached = computed(() => this.msgCountToday() >= 100);

    // 🛡️ Configuration (Moved here to keep component clean)
    private readonly firebaseConfig = {
        apiKey: "AIzaSyBzLHlVtGs8iTElQm_2p-GIAmifyrUDJsM",
        authDomain: "simplechatgithubactions.firebaseapp.com",
        projectId: "simplechatgithubactions",
        storageBucket: "simplechatgithubactions.firebasestorage.app",
        messagingSenderId: "399569683901",
        appId: "1:399569683901:web:8b1cd0b4f7510e4d72bed4"
    };

    constructor() {
        // 1. Initialize Firebase
        const app = getApps().length === 0 ? initializeApp(this.firebaseConfig) : getApp();
        this.db = getFirestore(app);
        this.auth = getAuth(app);

        // 2. Setup Auth Listener
        onAuthStateChanged(this.auth, (user) => {
            this.user.set(user);
            if (user) {
                this.checkDailyLimit(user.uid);
            } else {
                this.msgCountToday.set(0);
            }
        });

        // 3. Start Messages Listener
        this.loadMessages();
    }

    private loadMessages() {
        const q = query(collection(this.db, 'messages'), orderBy('timeStamp', 'desc'));

        onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.messages.set(msgs);
        }, (err) => console.error("Stream Error:", err));
    }

    async login() {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await signInWithPopup(this.auth, provider);
        } catch (err) {
            console.error("Login Failed:", err);
            throw err; // Re-throw to let component handle UI feedback if needed
        }
    }

    async logout() {
        await signOut(this.auth);
    }

    async sendMessage(text: string) {
        const user = this.user();
        if (!user || !text.trim() || this.limitReached()) return;

        try {
            await addDoc(collection(this.db, 'messages'), {
                messageText: text,
                senderId: user.uid,
                senderName: user.displayName,
                senderEmail: user.email || null,
                timeStamp: serverTimestamp()
            });
            // Re-check limit after sending
            this.checkDailyLimit(user.uid);
        } catch (err) {
            console.error("Send Failed:", err);
        }
    }

    async checkDailyLimit(userId: string) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const q = query(
            collection(this.db, 'messages'),
            where('senderId', '==', userId),
            where('timeStamp', '>=', startOfToday)
        );

        try {
            const snapshot = await getCountFromServer(q);
            this.msgCountToday.set(snapshot.data().count);
        } catch (err: any) {
            // Fail-safe: if index is missing, assume 0 so user isn't blocked
            console.warn("Limit check failed (likely missing index). Defaulting to 0.");
            this.msgCountToday.set(0);
        }
    }

    async deleteMessage(messageId: string) {
        try {
            await deleteDoc(doc(this.db, 'messages', messageId));
        } catch (err) {
            console.error("Delete Failed:", err);
        }
    }
}