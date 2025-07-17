# Dice Roller App

A Flutter application that demonstrates asynchronous programming by continuously rolling a six-sided die every 5 seconds.

## Features

- **Continuous Dice Rolling**: The app automatically rolls a six-sided die every 5 seconds
- **Asynchronous Programming**: Uses Dart's `Timer.periodic()` for non-blocking execution
- **Interactive UI**: Start/stop controls and visual dice display
- **Modern Flutter UI**: Material Design 3 with beautiful styling

## Key Components

### Dice Class
The `Dice` class encapsulates the dice rolling logic:
- `startRolling(Function(int) onRoll)`: Starts continuous rolling with callback
- `stopRolling()`: Stops the continuous rolling
- `roll()`: Generates a random value between 1 and 6

### Asynchronous Implementation
- Uses `Timer.periodic()` for non-blocking execution every 5 seconds
- Callback pattern for updating the UI when new values are rolled
- Proper resource management with timer cancellation

## How to Run

1. **Prerequisites**: Make sure you have Flutter SDK installed
2. **Get Dependencies**: Run `flutter pub get`
3. **Run the App**: Execute `flutter run`

## Technical Details

### Synchronous vs Asynchronous Programming

**Synchronous Programming:**
- Operations execute one after another
- Each operation must complete before the next starts
- Blocking execution model

**Asynchronous Programming (used in this app):**
- Operations can run concurrently
- Non-blocking execution
- Uses callbacks, futures, or streams for handling results

### Implementation Highlights

1. **Timer.periodic()**: Creates a recurring timer that fires every 5 seconds
2. **Callback Pattern**: The `onRoll` callback function receives the rolled value
3. **State Management**: Flutter's `setState()` updates the UI when new values arrive
4. **Resource Management**: Proper timer cancellation in `dispose()` method

## Code Structure

```
lib/
  main.dart          # Main application entry point
pubspec.yaml         # Flutter project configuration
README.md           # This file
```

The application demonstrates key concepts of asynchronous programming in Dart/Flutter while providing a practical example of continuous background operations with UI updates. 

flutter run -d linux