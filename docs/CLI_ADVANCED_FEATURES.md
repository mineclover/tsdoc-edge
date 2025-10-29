# CLI Advanced Features - Method Registration & Hierarchy

메서드 등록 및 계층 구조 관리를 위한 고급 CLI 기능

## 새로운 기능

### 1. 메서드 ID 등록 (`id new` 확장)
### 2. qualifiedName 검색 (`find-method`)
### 3. 계층 구조 시각화 (`tree`)
### 4. 검색 기능 강화

---

## 1. 메서드 ID 등록

### 기본 사용법

```bash
# 클래스 등록
tsdoc-edge id new src/UserService.ts UserService --type=class

# 인스턴스 메서드 등록
tsdoc-edge id new src/UserService.ts createUser \
  --type=method \
  --parent=000 \
  --member-type=instance

# 정적 메서드 등록
tsdoc-edge id new src/UserService.ts validateEmail \
  --type=method \
  --parent=000 \
  --member-type=static

# 중첩 함수 등록
tsdoc-edge id new src/UserService.ts sanitizeInput \
  --type=function \
  --parent=001 \
  --member-type=inner
```

### 옵션

| 옵션 | 설명 | 필수 | 값 |
|------|------|------|-----|
| `--type` | 심볼 타입 | 아니오 | class, function, method, property |
| `--parent` | 부모 심볼 ID | 아니오 | 000, 001, 등 |
| `--member-type` | 멤버 타입 | 아니오 | instance, static, inner |

### 출력 예시

```
✅ ID generated:

  ID: 001
  Qualified Name: UserService#createUser
  File: src/UserService.ts
  Symbol: createUser
  Type: method
  Parent: 000
  Member Type: instance
  Depth: 1

Add this to your TSDoc comment:
  @id 001
  @memberof UserService
```

### 자동 생성되는 정보

- **qualifiedName**: JSDoc 표기법 자동 생성
  - `UserService` (클래스)
  - `UserService#createUser` (인스턴스 메서드)
  - `UserService.validateEmail` (정적 메서드)
  - `UserService#createUser~sanitizeInput` (중첩 함수)

- **depth**: 계층 깊이 자동 계산
  - 0: 최상위 (클래스, 함수)
  - 1: 메서드, 프로퍼티
  - 2+: 중첩 함수

---

## 2. qualifiedName 검색

### 정확한 검색

```bash
# 인스턴스 메서드 검색
tsdoc-edge find-method "UserService#createUser"

# 정적 메서드 검색
tsdoc-edge find-method "UserService.validateEmail"

# 중첩 함수 검색
tsdoc-edge find-method "UserService#createUser~sanitizeInput"

# 클래스 검색
tsdoc-edge find-method "UserService"
```

### 부분 검색

```bash
# "User"가 포함된 모든 심볼 검색
tsdoc-edge find-method "User"

# "create"가 포함된 모든 심볼 검색
tsdoc-edge find-method "create"
```

### 출력 예시

#### 정확한 매치 (단일 결과)

```
================================================================================
Search: UserService#createUser
================================================================================

001 → UserService#createUser

File:       src/services/UserService.ts
Line:       20
Type:       method
Depth:      1
Parent:     000 (UserService)
Member Type: instance
Created:    2025-10-29T13:17:05.389Z
Updated:    2025-10-29T13:17:05.389Z

Children (1):
  004 → UserService#createUser~sanitizeInput
```

#### 부분 매치 (여러 결과)

```
================================================================================
Search: User
================================================================================

Found 6 matching symbols:

000 → UserService
  File: src/services/UserService.ts:15
  Type: class

001 → UserService#createUser
  File: src/services/UserService.ts:20
  Type: method

002 → UserService#getUser
  File: src/services/UserService.ts:30
  Type: method

...
```

---

## 3. 계층 구조 시각화

### 사용법

```bash
tsdoc-edge tree
```

### 출력 예시

```
================================================================================
Symbol Hierarchy Tree
================================================================================

└── 000 UserService (class)
    ├── 001 UserService#createUser (method)
    │   └── 004 UserService#createUser~sanitizeInput (function)
    ├── 002 UserService#getUser (method)
    ├── 003 UserService.validateEmail (method)
    └── 005 UserService#deleteUser (method)

Total symbols: 6
```

### 색상 코드

- **파란색**: 클래스
- **초록색**: 메서드
- **청록색**: 함수
- **굵게**: 심볼 ID

---

## 4. 실전 워크플로우

### 시나리오: UserService 클래스에 메서드 추가

#### Step 1: 클래스 등록

```bash
tsdoc-edge id new src/services/UserService.ts UserService --type=class
# Output: ID: 000
```

#### Step 2: 현재 구조 확인

```bash
tsdoc-edge tree
```

```
└── 000 UserService (class)

Total symbols: 1
```

#### Step 3: 인스턴스 메서드 추가

```bash
tsdoc-edge id new src/services/UserService.ts createUser \
  --type=method \
  --parent=000 \
  --member-type=instance
# Output: ID: 001, Qualified Name: UserService#createUser
```

#### Step 4: 정적 메서드 추가

```bash
tsdoc-edge id new src/services/UserService.ts validateEmail \
  --type=method \
  --parent=000 \
  --member-type=static
# Output: ID: 002, Qualified Name: UserService.validateEmail
```

#### Step 5: 중첩 helper 추가

```bash
tsdoc-edge id new src/services/UserService.ts sanitizeInput \
  --type=function \
  --parent=001 \
  --member-type=inner
# Output: ID: 003, Qualified Name: UserService#createUser~sanitizeInput
```

#### Step 6: 최종 구조 확인

```bash
tsdoc-edge tree
```

```
└── 000 UserService (class)
    ├── 001 UserService#createUser (method)
    │   └── 003 UserService#createUser~sanitizeInput (function)
    └── 002 UserService.validateEmail (method)

Total symbols: 4
```

#### Step 7: 메서드 찾기

```bash
tsdoc-edge find-method "UserService#createUser"
```

#### Step 8: TSDoc 작성

```typescript
/**
 * User service handling authentication and user management
 *
 * @id 000
 * @public
 * @class
 */
export class UserService {
  /**
   * Create a new user
   *
   * @id 001
   * @memberof UserService
   * @instance
   *
   * @param user - User data
   * @returns Created user
   * @public
   */
  createUser(user: User): User {
    /**
     * Sanitize user input
     *
     * @id 003
     * @memberof UserService#createUser
     * @inner
     */
    function sanitizeInput(data: string): string {
      // Implementation
    }

    // Implementation
  }

  /**
   * Validate email format
   *
   * @id 002
   * @memberof UserService
   * @static
   *
   * @param email - Email to validate
   * @returns True if valid
   * @public
   */
  static validateEmail(email: string): boolean {
    // Implementation
  }
}
```

---

## 5. 고급 사용 사례

### 사례 1: 복잡한 클래스 계층 구조

```typescript
// DataProcessor.ts

/**
 * @id 010
 */
export class DataProcessor {
  /**
   * @id 011
   * @memberof DataProcessor
   */
  process(data: any): void {
    /**
     * @id 012
     * @memberof DataProcessor#process
     */
    function validate() { }

    /**
     * @id 013
     * @memberof DataProcessor#process
     */
    function transform() { }
  }

  /**
   * @id 014
   * @memberof DataProcessor
   */
  static createDefault(): DataProcessor { }
}
```

**트리 구조**:
```
└── 010 DataProcessor (class)
    ├── 011 DataProcessor#process (method)
    │   ├── 012 DataProcessor#process~validate (function)
    │   └── 013 DataProcessor#process~transform (function)
    └── 014 DataProcessor.createDefault (method)
```

### 사례 2: 여러 클래스 간의 관계

```bash
# AuthService
tsdoc-edge id new src/AuthService.ts AuthService --type=class
tsdoc-edge id new src/AuthService.ts login --type=method --parent=020 --member-type=instance
tsdoc-edge id new src/AuthService.ts logout --type=method --parent=020 --member-type=instance

# UserService
tsdoc-edge id new src/UserService.ts UserService --type=class
tsdoc-edge id new src/UserService.ts createUser --type=method --parent=030 --member-type=instance
tsdoc-edge id new src/UserService.ts getUser --type=method --parent=030 --member-type=instance
```

**트리 구조**:
```
├── 020 AuthService (class)
│   ├── 021 AuthService#login (method)
│   └── 022 AuthService#logout (method)
└── 030 UserService (class)
    ├── 031 UserService#createUser (method)
    └── 032 UserService#getUser (method)
```

---

## 6. SymbolRegistryManager API

프로그래밍 방식으로 레지스트리를 관리할 수 있습니다.

### 새로 추가된 메서드

```typescript
// qualifiedName으로 검색
const entry = manager.findByQualifiedName("UserService#createUser");

// 직계 자식만 가져오기
const children = manager.getChildren("000");

// 모든 후손 가져오기 (재귀)
const descendants = manager.getDescendants("000");

// 계층 구조 빌드
const hierarchy = manager.buildHierarchy();

// 부분 검색
const results = manager.search("User");
```

### 사용 예시

```typescript
import { SymbolRegistryManager } from './storage/SymbolRegistryManager';

const manager = new SymbolRegistryManager('.tsdoc/registry.jsonl');

// 클래스 등록
const classId = manager.register({
  filePath: 'src/UserService.ts',
  symbolName: 'UserService',
  type: 'class',
});

// 메서드 등록 (자동으로 qualifiedName과 depth 생성)
const methodId = manager.register({
  filePath: 'src/UserService.ts',
  symbolName: 'createUser',
  type: 'method',
  memberOf: classId,
  memberType: 'instance',
});

manager.save();

// 검색
const entry = manager.findByQualifiedName('UserService#createUser');
console.log(entry?.sourceRef.depth); // 1
console.log(entry?.sourceRef.qualifiedName); // "UserService#createUser"
```

---

## 7. Future Plans 통합

### Future Plan에서 메서드 지정

```typescript
/**
 * @futurePlan PLAN-042
 * @planTitle Add CSV streaming support
 * @planTargetSymbol UserService
 * @planTargetMethod loadCSV
 * @planStatus planned
 */
export class UserService {
  // loadCSV 메서드가 추가될 예정
}
```

### 구현 후 링크

```typescript
/**
 * @futurePlan PLAN-042
 * @planStatus completed
 * @planImplementedBy 042
 */
export class UserService {
  /**
   * @id 042
   * @implements PLAN-042
   * @memberof UserService
   */
  loadCSV() { }
}
```

---

## 8. 팁 & 모범 사례

### Do's ✅

1. **항상 클래스부터 등록**
   ```bash
   tsdoc-edge id new src/MyClass.ts MyClass --type=class
   ```

2. **부모 ID 확인 후 메서드 등록**
   ```bash
   tsdoc-edge id list
   tsdoc-edge id new src/MyClass.ts myMethod --type=method --parent=XXX
   ```

3. **tree 명령어로 주기적 확인**
   ```bash
   tsdoc-edge tree
   ```

4. **qualifiedName 저장하여 참조**
   - Future Plans에서 targetMethod에 사용
   - @implements 태그에서 사용

### Don'ts ❌

1. **부모 없이 메서드 등록하지 말기**
   ```bash
   # ❌ 나쁜 예
   tsdoc-edge id new src/MyClass.ts myMethod --type=method

   # ✅ 좋은 예
   tsdoc-edge id new src/MyClass.ts myMethod --type=method --parent=000
   ```

2. **잘못된 member-type 사용**
   ```bash
   # ❌ static 메서드에 instance 사용
   tsdoc-edge id new src/MyClass.ts create --type=method --member-type=instance

   # ✅ 올바른 타입 지정
   tsdoc-edge id new src/MyClass.ts create --type=method --member-type=static
   ```

3. **계층 구조 무시**
   - 중첩 함수는 반드시 메서드의 자식으로 등록

---

## 9. 트러블슈팅

### 문제: qualifiedName이 undefined

**원인**: 이전에 등록된 심볼은 qualifiedName이 없음

**해결**:
```bash
# 레지스트리 재생성
rm .tsdoc/registry.jsonl
tsdoc-edge id new ...
```

### 문제: 부모를 찾을 수 없음

**원인**: 잘못된 부모 ID

**해결**:
```bash
# 모든 심볼 목록 확인
tsdoc-edge id list

# 올바른 부모 ID 사용
tsdoc-edge id new ... --parent=올바른ID
```

### 문제: 트리가 제대로 표시되지 않음

**원인**: 레지스트리 손상

**해결**:
```bash
# 통계 확인
tsdoc-edge id stats

# 필요시 재생성
```

---

## 10. 다음 단계

### 현재 지원되는 기능
- ✅ 메서드 ID 등록 with --parent
- ✅ qualifiedName 자동 생성
- ✅ depth 자동 계산
- ✅ 계층 구조 시각화 (tree)
- ✅ qualifiedName 검색
- ✅ 부분 검색

### 향후 기획
- [ ] TypeScript AST 파싱으로 자동 등록
- [ ] IDE 플러그인 (VSCode Extension)
- [ ] @memberof 태그 자동 파싱
- [ ] 계층 구조 검증
- [ ] 순환 참조 탐지

---

## 참고 자료

- [JSDoc Namepaths](https://jsdoc.app/about-namepaths.html)
- [Symbol Hierarchy Strategy](./SYMBOL_HIERARCHY_AND_ID_STRATEGY.md)
- [CLI Usage Guide](./CLI_USAGE.md)
