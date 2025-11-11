# [[Event Flow]]

Event-driven communication flow tracking.

**Type**: `event-flow` | **Category**: Behavioral | **Status**: Planned

## Purpose

Track event emission, propagation, and handling across the application, enabling event-driven architecture analysis.

## Examples

### Event Emitter Pattern
```typescript
class UserService extends EventEmitter {
  createUser(data: UserData) {
    const user = this.db.create(data);
    this.emit('user:created', user);  // ← Event flow origin
  }
}

class NotificationService {
  constructor(userService: UserService) {
    userService.on('user:created', (user) => {  // ← Event flow handler
      this.sendWelcomeEmail(user);
    });
  }
}
```

### DOM Events
```typescript
button.addEventListener('click', handleClick);  // ← Event flow registration
form.dispatchEvent(new Event('submit'));       // ← Event flow emission
```

### Custom Event Bus
```typescript
class EventBus {
  emit(event: string, payload: any) { ... }
  on(event: string, handler: Function) { ... }
}

// Component A emits
eventBus.emit('data:updated', newData);

// Component B listens
eventBus.on('data:updated', (data) => { ... });
```

## Detection Strategy

**Event Emission Detection**:
- Methods: `emit()`, `dispatch()`, `trigger()`, `fire()`, `publish()`
- Pattern: `dispatchEvent()`, `CustomEvent`, `EventEmitter`

**Event Handling Detection**:
- Methods: `on()`, `addEventListener()`, `subscribe()`, `listen()`
- Decorators: `@EventHandler`, `@Subscribe`

**Event Flow Analysis**:
```typescript
// Trace: UserService.create → 'user:created' → NotificationService.sendEmail
//                            ↘ 'user:created' → AnalyticsService.track
```

## Metadata

```json
{
  "eventName": "user:created",
  "emitter": "UserService.createUser",
  "handlers": ["NotificationService.sendWelcomeEmail", "AnalyticsService.track"],
  "payload": "User",
  "async": true,
  "propagation": "broadcast"
}
```

## Use Cases

1. **Event Flow Visualization**: Generate event flow diagrams
2. **Dead Event Detection**: Find events with no handlers
3. **Event Storm Analysis**: Detect cascading event chains
4. **Testing Coverage**: Ensure all event paths tested

**Commands**:
```bash
# Analyze event flows
tsdoc-edge analyze-events

# Find unhandled events
tsdoc-edge analyze-events --unhandled

# Trace specific event
tsdoc-edge analyze-events --trace user:created
```

## Related

- [[Callback Pattern]]: Event handlers are specialized callbacks
- [[Pipeline]]: Events can form processing pipelines
- [[Call Relationships]]: Event handlers create indirect calls

---

**Status**: Planned for v2.1
**Priority**: High (common in modern architectures)
**Complexity**: High (requires control flow + pattern matching)

---

## Backlinks

### Referenced By

- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:134
- [[Callback Pattern]] → /home/user/tsdoc-edge/managed/relationships/CALLBACK.md:140
- [[SELF-IMPROVEMENT-PROCESS]] → /home/user/tsdoc-edge/managed/workflows/self-improvement-process.md:41

