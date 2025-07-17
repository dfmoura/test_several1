import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

void main() {
  runApp(const DiceRollerApp());
}

class DiceRollerApp extends StatelessWidget {
  const DiceRollerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dice Roller',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const DiceRollerPage(),
    );
  }
}

class DiceRollerPage extends StatefulWidget {
  const DiceRollerPage({super.key});

  @override
  State<DiceRollerPage> createState() => _DiceRollerPageState();
}

class _DiceRollerPageState extends State<DiceRollerPage> {
  final Dice _dice = Dice();
  int _currentValue = 1;
  bool _isRolling = false;

  @override
  void initState() {
    super.initState();
    _startRolling();
  }

  @override
  void dispose() {
    _dice.stopRolling();
    super.dispose();
  }

  void _startRolling() {
    setState(() {
      _isRolling = true;
    });
    
    _dice.startRolling((value) {
      if (mounted) {
        setState(() {
          _currentValue = value;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dice Roller'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Current Roll:',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 20),
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withValues(alpha: 0.3),
                    spreadRadius: 2,
                    blurRadius: 5,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  '$_currentValue',
                  style: const TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 30),
            Text(
              _isRolling ? 'Rolling every 5 seconds...' : 'Stopped',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              spacing: 20,
              children: [
                ElevatedButton(
                  onPressed: _isRolling ? null : _startRolling,
                  child: const Text('Start Rolling'),
                ),
                ElevatedButton(
                  onPressed: _isRolling ? () {
                    setState(() {
                      _isRolling = false;
                    });
                    _dice.stopRolling();
                  } : null,
                  child: const Text('Stop Rolling'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class Dice {
  Timer? _timer;
  final Random _random = Random();
  
  /// Starts rolling the dice continuously every 5 seconds
  /// [onRoll] is a callback function that receives the rolled value
  void startRolling(Function(int) onRoll) {
    // Stop any existing timer
    stopRolling();
    
    // Start a new timer that fires every 5 seconds
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      final value = roll();
      onRoll(value);
    });
    
    // Roll immediately for the first time
    final initialValue = roll();
    onRoll(initialValue);
  }
  
  /// Stops the continuous rolling
  void stopRolling() {
    _timer?.cancel();
    _timer = null;
  }
  
  /// Rolls the dice and returns a value between 1 and 6
  int roll() {
    // Generate random value from 0 to 5, then add 1 to get 1 to 6
    return _random.nextInt(6) + 1;
  }
} 