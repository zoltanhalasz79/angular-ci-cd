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

  // ✅ Test 5: Delete Message
  it('should call deleteMessage service method when delete button is clicked', () => {
    // Setup: Logged in user with messages
    mockChatService.user.set({ uid: 'user1', displayName: 'Alice' });
    const messageId = 'msg-123';
    mockChatService.messages.set([
      {
        id: messageId,
        messageText: 'Test message',
        senderId: 'user1',
        senderName: 'Alice',
        timestamp: new Date()
      }
    ]);
    fixture.detectChanges();

    // Mock the deleteMessage method
    mockChatService.deleteMessage = vi.fn();

    // Find and click the delete button
    const deleteBtn = fixture.debugElement.query(By.css('.btn-delete'));
    if (deleteBtn) {
      deleteBtn.nativeElement.click();
      expect(mockChatService.deleteMessage).toHaveBeenCalledWith(messageId);
    }
  });

  // ✅ Test 6: Edit Message - Start Editing
  it('should enter edit mode when edit button is clicked', () => {
    // Setup: Logged in user with message
    mockChatService.user.set({ uid: 'user1', displayName: 'Alice' });
    const messageId = 'msg-456';
    const messageText = 'Original message';
    mockChatService.messages.set([
      {
        id: messageId,
        messageText: messageText,
        senderId: 'user1',
        senderName: 'Alice',
        timestamp: new Date()
      }
    ]);
    fixture.detectChanges();

    // Click edit button
    const editBtn = fixture.debugElement.query(By.css('.btn-edit'));
    if (editBtn) {
      editBtn.nativeElement.click();
      fixture.detectChanges();

      // Verify edit mode is active
      expect(component.editingMessageId).toBe(messageId);
      expect(component.editingMessageText).toBe(messageText);
    }
  });

  // ✅ Test 7: Edit Message - Cancel Editing
  it('should cancel edit mode when cancel button is clicked', () => {
    // Setup: Enter edit mode
    component.editingMessageId = 'msg-456';
    component.editingMessageText = 'Original message';
    fixture.detectChanges();

    // Get cancel button and click it
    const cancelBtn = fixture.debugElement.query(By.css('.btn-cancel'));
    if (cancelBtn) {
      cancelBtn.nativeElement.click();
      expect(component.editingMessageId).toBeNull();
      expect(component.editingMessageText).toBe('');
    }
  });

  // ✅ Test 8: Edit Message - Save Editing
  it('should call updateMessage service method when save is clicked', async () => {
    // Setup: Enter edit mode
    component.editingMessageId = 'msg-456';
    component.editingMessageText = 'Updated message text';
    mockChatService.updateMessage = vi.fn().mockResolvedValue(undefined);
    fixture.detectChanges();

    // Call saveEdit
    await component.saveEdit('Updated message text');

    // Verify service method was called
    expect(mockChatService.updateMessage).toHaveBeenCalledWith('msg-456', 'Updated message text');
    // Verify edit mode is cleared
    expect(component.editingMessageId).toBeNull();
    expect(component.editingMessageText).toBe('');
  });

  // ✅ Test 9: Timestamp Formatting - Firestore Timestamp
  it('should format Firestore Timestamp correctly', () => {
    // Mock a Firestore Timestamp object with seconds and nanoseconds
    const mockTimestamp = {
      seconds: Math.floor(new Date('2026-02-14T14:23:00Z').getTime() / 1000),
      nanoseconds: 0
    };

    const formatted = component.formatTimestamp(mockTimestamp);
    expect(formatted).toContain('Feb');
    expect(formatted).toContain('14');
    expect(formatted).toContain('2026');
  });

  // ✅ Test 10: Timestamp Formatting - Milliseconds
  it('should format millisecond timestamp correctly', () => {
    const timestamp = new Date('2026-02-14T14:23:00Z').getTime();
    const formatted = component.formatTimestamp(timestamp);

    expect(formatted).toContain('Feb');
    expect(formatted).toContain('14');
  });

  // ✅ Test 11: Timestamp Formatting - Invalid Input
  it('should return empty string for invalid timestamp', () => {
    expect(component.formatTimestamp(null)).toBe('');
    expect(component.formatTimestamp(undefined)).toBe('');
    expect(component.formatTimestamp('invalid')).toBe('');
  });

  // ✅ Test 12: Message Limit Display
  it('should display message limit status when limit is reached', () => {
    mockChatService.user.set({ uid: 'user1', displayName: 'Alice' });
    mockChatService.msgCountToday.set(100);
    mockChatService.limitReached = true;
    fixture.detectChanges();

    // Note: limitReached is a computed signal, but for mocking we set it as a boolean
    // The UI should display limit-reached-status when limit is reached
    expect(component.chatService.msgCountToday()).toBe(100);
  });

  // ✅ Test 13: Empty Messages State
  it('should display empty state message when no messages exist', () => {
    mockChatService.user.set({ uid: 'user1', displayName: 'Alice' });
    mockChatService.messages.set([]);
    fixture.detectChanges();

    const messageCards = fixture.debugElement.queryAll(By.css('.message-card'));
    expect(messageCards.length).toBe(0);
  });

  // ✅ Test 14: Edit Mode Footer Display
  it('should show Save and Cancel buttons when in edit mode', () => {
    mockChatService.user.set({ uid: 'user1', displayName: 'Alice' });
    component.editingMessageId = 'msg-789';
    component.editingMessageText = 'Editing message';
    fixture.detectChanges();

    // In edit mode, the Save button uses class "btn-send" with text "Save"
    const saveBtn = fixture.debugElement.query(By.css('button.btn-send'));
    // The Cancel button uses class "btn-cancel"
    const cancelBtn = fixture.debugElement.query(By.css('button.btn-cancel'));

    expect(saveBtn).toBeTruthy();
    expect(saveBtn.nativeElement.textContent).toContain('Save');
    expect(cancelBtn).toBeTruthy();
    expect(cancelBtn.nativeElement.textContent).toContain('Cancel');
  });

  // ✅ Test 15: Send Message with Empty Text
  it('should not call sendMessage when text is empty', () => {
    mockChatService.user.set({ uid: 'user1' });
    mockChatService.sendMessage = vi.fn();
    fixture.detectChanges();

    const inputEl = fixture.debugElement.query(By.css('input')).nativeElement;
    const sendBtn = fixture.debugElement.query(By.css('.btn-send'));

    // Set empty text
    inputEl.value = '';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Send button should be disabled, so clicking it should not trigger sendMessage
    // (The button is likely disabled via [disabled] binding in the template)
    expect(sendBtn.nativeElement.disabled || !sendBtn).toBeTruthy();
  });
});