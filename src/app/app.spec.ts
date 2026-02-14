import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app';
import { ChatService } from './chat.service';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockChatService: any;

  beforeEach(async () => {
    // 1. Create a mock service using Vitest spies (vi.fn)
    // We use real signals here so the UI updates naturally during the test
    mockChatService = {
      user: signal(null),
      messages: signal([]),
      msgCountToday: signal(0),
      limitReached: signal(false), // Mocking the computed signal as a regular signal for simplicity
      login: vi.fn(),
      logout: vi.fn(),
      sendMessage: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent], // AppComponent is standalone
      providers: [
        // Inject our mock instead of the real ChatService
        { provide: ChatService, useValue: mockChatService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger initial data binding
  });

  // ✅ Test 1: Sanity Check
  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  // ✅ Test 2: UI State (Logged Out)
  it('should show the Login button when no user is present', () => {
    // Set state to logged out
    mockChatService.user.set(null);
    fixture.detectChanges();

    const loginBtn = fixture.debugElement.query(By.css('.btn-login'));
    const logoutBtn = fixture.debugElement.query(By.css('.btn-logout'));

    expect(loginBtn).toBeTruthy();
    expect(logoutBtn).toBeNull();
    expect(loginBtn.nativeElement.textContent).toContain('Login');
  });

  // ✅ Test 3: UI State (Logged In with Messages)
  it('should display messages when user is logged in', () => {
    // 1. Simulate User Login
    mockChatService.user.set({ uid: 'user1', displayName: 'Alice', photoURL: 'fake.jpg' });

    // 2. Simulate Incoming Messages
    mockChatService.messages.set([
      { id: '1', messageText: 'Hello Vitest!', senderId: 'user1', senderName: 'Alice' },
      { id: '2', messageText: 'Hi Alice', senderId: 'user2', senderName: 'Bob' }
    ]);

    fixture.detectChanges();

    // 3. Verify HTML rendering
    const messageCards = fixture.debugElement.queryAll(By.css('.message-card'));
    expect(messageCards.length).toBe(2);
    expect(messageCards[0].nativeElement.textContent).toContain('Hello Vitest!');
  });

  // ✅ Test 4: User Interaction (Sending a Message)
  it('should call sendMessage service method when Send is clicked', () => {
    // Setup: Logged in user
    mockChatService.user.set({ uid: 'user1' });
    fixture.detectChanges();

    // 1. Find elements
    const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
    const sendBtn = fixture.debugElement.query(By.css('.btn-send'));

    // 2. Simulate typing
    inputEl.value = 'Testing 123';
    inputEl.dispatchEvent(new Event('input')); // Angular needs this event to update the template binding
    fixture.detectChanges();

    // 3. Click Send
    sendBtn.nativeElement.click();

    // 4. Verify the spy was called with correct data
    expect(mockChatService.sendMessage).toHaveBeenCalledWith('Testing 123');
  });
});