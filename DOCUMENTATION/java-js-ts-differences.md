# Java vs JavaScript vs TypeScript

## Constructor Parameters & Property Assignment

**Java:**
```java
class Example {
  private String name;
  
  public Example(String name) {
    this.name = name;  // explicit assignment required
  }
}
```

**JavaScript/TypeScript:**
```typescript
class Example {
  private name: string;
  
  constructor(name: string) {
    this.name = name;  // explicit assignment needed (same as Java)
  }
}
```

**TypeScript shorthand (parameter modifier syntax):**
```typescript
class Example {
  constructor(private readonly name: string) {}  // auto-declares & assigns
}
```
Adding `private`, `public`, `protected`, or `readonly` to a constructor parameter automatically declares and assigns the property. No explicit `this.name = name;` needed.

---

## Method Calls

**Java:**
```java
class Example {
  private String format() { return "result"; }
  
  public String execute() {
    return format();      // ✅ optional this
    return this.format(); // ✅ also works
  }
}
```

**TypeScript/JavaScript:**
```typescript
class Example {
  private format(): string { return "result"; }
  
  execute(): string {
    return format();      // ❌ won't work (looks for standalone function)
    return this.format(); // ✅ required
  }
}
```

In **Java**, `this` is optional for instance method calls within the same class. In **TypeScript/JavaScript**, `this` is **mandatory**.

---

## Method vs Property Declaration

Both languages require explicit declaration of:
- **Methods:** Define in class body with signature, call via `this.methodName()`
- **Properties:** Declare type/value, access via `this.propertyName`

TypeScript only adds the constructor parameter shorthand convenience for properties.

---

## Type System

**Java:** Strictly typed at compile-time; type checking enforced before runtime.

**TypeScript:** Optionally typed; types are checked at compile-time but erased at runtime (no runtime overhead).

**JavaScript:** Dynamically typed; no types at all—runtime determines types on the fly.

---

## null vs undefined

**Java:** Only has `null`.

**TypeScript/JavaScript:** Have both:
- `undefined` = variable declared but not assigned
- `null` = intentionally set to nothing

```typescript
let a;           // undefined (declared, not assigned)
let b = null;    // null (explicitly set)
let c = undefined; // undefined (explicitly set)
```

---

## const vs final

**Java:**
```java
final MyObject obj = new MyObject();
obj = new MyObject();  // ❌ error - reassignment blocked
```

**TypeScript/JavaScript:**
```typescript
const obj = { name: 'John' };
obj.name = 'Jane';  // ✅ allowed (object is mutable)
obj = {};           // ❌ error (reassignment blocked)
```

`const` blocks reassignment of the variable, but objects and arrays are still mutable.

---

## this Binding (Context)

**Java:** `this` always refers to the instance; context never changes.

**TypeScript/JavaScript:** `this` is dynamically bound and depends on how the function is called.

```typescript
class Example {
  name = 'John';
  greet() { console.log(this.name); }
}

const ex = new Example();
ex.greet();           // ✅ 'John' (this = ex)

const fn = ex.greet;
fn();                 // ❌ error (this = undefined, not ex!)

// Solutions:
ex.greet.bind(ex)();  // ✅ works
const fn = () => ex.greet();  // ✅ arrow function works
```

---

## Async & Concurrency

**Java:** Multi-threaded (Threads, Futures, virtual threads in Java 19+).

**TypeScript/JavaScript:** Single-threaded with an event loop. Concurrency via:
- **Promises** - represent a value that may be available later
- **async/await** - syntactic sugar over Promises
- **Callbacks** - functions called when async operation completes

```typescript
// Java-like thinking (doesn't work in JS):
// const result = fetchData();  // blocks until ready

// TypeScript/JavaScript approach:
const result = await fetchData();  // non-blocking
// or
fetchData().then(result => { /* ... */ });
```

---

## Error Handling

**Java:** Checked exceptions; compiler forces you to handle or declare them.

**TypeScript/JavaScript:** All errors are unchecked; no compile-time enforcement. Rely on:
- Convention (JSDoc comments about thrown errors)
- Runtime try/catch
- Type system (Promise rejection, Optional types)

```typescript
// No compile-time requirement to handle errors
async function fetch() {
  throw new Error('Network failure');  // caller doesn't have to catch
}
```

---

## Closures & Variable Capture

**Java:** Limited closures; captured variables must be `final` or effectively final.

**TypeScript/JavaScript:** Full closures; functions capture their entire lexical scope.

```typescript
function makeCounter() {
  let count = 0;  // not final, but captured
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count
  };
}

const counter = makeCounter();
counter.increment();  // ✅ count changes persist across calls
```

---

## Array/Collection Methods

**Java:**
```java
list.stream()
  .map(x -> x * 2)
  .filter(x -> x > 10)
  .forEach(System.out::println);
```

**TypeScript/JavaScript:** Same method names, similar syntax, same functional approach:
```typescript
list
  .map(x => x * 2)
  .filter(x => x > 10)
  .forEach(x => console.log(x));
```

The concepts are identical; syntax differs slightly (arrow functions `=>` vs `->`).
