class RouletteGame {
    constructor() {
        this.balance = 10000;
        this.currentBets = {};
        this.isSpinning = false;
        this.history = [];
        this.lastResult = null;
        this.soundEnabled = true;
        this.currentRotation = 0; // Track current wheel rotation for consistent spinning
        this.wheelNumbers = []; // Store references to wheel number elements
        
        // Roulette numbers with their colors (European roulette)
        this.rouletteNumbers = {
            0: 'green',
            1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
            7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
            13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
            19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
            25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
            31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
        };
        
        // Payout ratios for different bet types
        this.payouts = {
            number: 35,    // Single number
            color: 1,      // Red/Black
            even: 1,       // Even/Odd
            odd: 1,
            range: 1,      // 1-18/19-36
            dozen: 2,      // 1st12, 2nd12, 3rd12
            column: 2      // Column bets
        };
        
        this.init();
        this.initSounds();
    }
    
    initSounds() {
        // Create audio context for better browser compatibility
        this.audioContext = null;
        
        // Sound effects using Web Audio API for better performance
        this.sounds = {
            chipPlace: this.createBeepSound(800, 0.1, 0.1),
            wheelSpin: this.createSpinSound(),
            ballBounce: this.createBeepSound(600, 0.05, 0.3),
            win: this.createWinSound(),
            lose: this.createLoseSound(),
            ballDrop: this.createBeepSound(400, 0.2, 0.5)
        };
    }
    
    createAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }
    
    createBeepSound(frequency, duration, volume = 0.3) {
        return () => {
            if (!this.soundEnabled) return;
            
            const ctx = this.createAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        };
    }
    
    createSpinSound() {
        return () => {
            if (!this.soundEnabled) return;
            
            const ctx = this.createAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(200, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 4); // Match 4-second duration
            oscillator.type = 'sawtooth';
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 4); // Match 4-second duration
            
            gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 4); // Match 4-second duration
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 4); // Match 4-second duration
        };
    }
    
    createWinSound() {
        return () => {
            if (!this.soundEnabled) return;
            
            const ctx = this.createAudioContext();
            const frequencies = [523, 659, 784, 1047]; // C, E, G, C
            
            frequencies.forEach((freq, index) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'triangle';
                
                const startTime = ctx.currentTime + index * 0.15;
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + 0.4);
            });
        };
    }
    
    createLoseSound() {
        return () => {
            if (!this.soundEnabled) return;
            
            const ctx = this.createAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(300, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.5);
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.5);
        };
    }
    
    init() {
        this.createNumberGrid();
        this.bindEvents();
        this.updateDisplay();
        this.createWheelNumbers();
    }
    
    createNumberGrid() {
        const mainNumbers = document.querySelector('.main-numbers');
        mainNumbers.innerHTML = '';
        
        // Create numbers 1-36 in roulette table order
        const tableOrder = [
            [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
            [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
            [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
        ];
        
        tableOrder.forEach(row => {
            row.forEach(num => {
                const spot = document.createElement('div');
                spot.className = `bet-spot ${this.rouletteNumbers[num]}`;
                spot.dataset.bet = num;
                spot.dataset.type = 'number';
                spot.textContent = num;
                mainNumbers.appendChild(spot);
            });
        });
    }
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('soundToggle');
        
        if (this.soundEnabled) {
            soundBtn.textContent = '🔊';
            soundBtn.classList.remove('muted');
            // Play a test sound to indicate sound is on
            this.sounds.chipPlace();
        } else {
            soundBtn.textContent = '🔇';
            soundBtn.classList.add('muted');
        }
    }
    
    createWheelNumbers() {
        // European roulette wheel order
        const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
        const wheelNumbers = document.querySelector('.wheel-numbers');
        this.wheelNumbers = []; // Reset array
        
        wheelOrder.forEach((num, index) => {
            const numberElement = document.createElement('div');
            numberElement.className = 'wheel-number';
            numberElement.textContent = num;
            numberElement.dataset.number = num; // Add data attribute for easy identification
            numberElement.style.position = 'absolute';
            numberElement.style.color = 'white';
            numberElement.style.fontSize = '12px';
            numberElement.style.fontWeight = 'bold';
            numberElement.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            numberElement.style.pointerEvents = 'none'; // Prevent interference with wheel rotation
            
            // Position numbers around the wheel
            const angle = (index * 360) / wheelOrder.length;
            const radius = 120;
            const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
            const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
            
            numberElement.style.left = `calc(50% + ${x}px - 10px)`;
            numberElement.style.top = `calc(50% + ${y}px - 10px)`;
            numberElement.style.width = '20px';
            numberElement.style.height = '20px';
            numberElement.style.display = 'flex';
            numberElement.style.alignItems = 'center';
            numberElement.style.justifyContent = 'center';
            numberElement.style.borderRadius = '50%';
            numberElement.style.transition = 'none'; // Remove transition to prevent conflicts
            
            wheelNumbers.appendChild(numberElement);
            
            // Store reference for later use
            this.wheelNumbers.push({
                element: numberElement,
                number: num
            });
        });
    }
    
    bindEvents() {
        // Bet spot clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('bet-spot') && !this.isSpinning) {
                this.placeBet(e.target);
            }
        });
        
        // Quick bet buttons
        document.querySelectorAll('.quick-bet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseInt(e.target.dataset.amount);
                document.getElementById('betAmount').value = amount;
            });
        });
        
        // Spin button
        document.getElementById('spinBtn').addEventListener('click', () => {
            if (!this.isSpinning && this.getTotalBetAmount() > 0) {
                this.spin();
            }
        });
        
        // Clear bets button
        document.getElementById('clearBets').addEventListener('click', () => {
            if (!this.isSpinning) {
                this.clearAllBets();
            }
        });
        
        // Sound toggle button
        document.getElementById('soundToggle').addEventListener('click', () => {
            this.toggleSound();
        });
        
        // Bet amount input validation
        document.getElementById('betAmount').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value > this.balance) {
                e.target.value = this.balance;
            }
            if (value < 1) {
                e.target.value = 1;
            }
        });
    }
    
    placeBet(spot) {
        const betAmount = parseInt(document.getElementById('betAmount').value);
        const betKey = spot.dataset.bet;
        const betType = spot.dataset.type;
        
        if (betAmount > this.balance) {
            this.showMessage('Insufficient balance!', 'lose');
            return;
        }
        
        if (this.getTotalBetAmount() + betAmount > this.balance) {
            this.showMessage('Not enough balance for this bet!', 'lose');
            return;
        }
        
        // Add or increase bet
        if (this.currentBets[betKey]) {
            this.currentBets[betKey].amount += betAmount;
        } else {
            this.currentBets[betKey] = {
                amount: betAmount,
                type: betType,
                element: spot
            };
        }
        
        this.updateBetDisplay(spot, this.currentBets[betKey].amount);
        this.updateBetsList();
        this.updateDisplay();
        
        // Play chip place sound
        this.sounds.chipPlace();
    }
    
    updateBetDisplay(spot, amount) {
        // Remove existing chip
        const existingChip = spot.querySelector('.bet-chip');
        if (existingChip) {
            existingChip.remove();
        }
        
        // Add new chip with amount
        const chip = document.createElement('div');
        chip.className = 'bet-chip';
        chip.textContent = amount;
        spot.appendChild(chip);
    }
    
    clearAllBets() {
        this.currentBets = {};
        
        // Remove all bet chips from display
        document.querySelectorAll('.bet-chip').forEach(chip => {
            chip.remove();
        });
        
        // Remove winning number highlight
        this.clearWinningHighlight();
        
        this.updateBetsList();
        this.updateDisplay();
    }
    
    // Clear winning number highlight (both table and wheel)
    clearWinningHighlight() {
        // Clear betting table highlights
        document.querySelectorAll('.winning-number').forEach(element => {
            element.classList.remove('winning-number');
        });
        
        // Clear wheel number highlights - FIXED
        this.wheelNumbers.forEach(wheelNum => {
            const element = wheelNum.element;
            element.classList.remove('winning-wheel-number');
            // Reset all inline styles to original state
            element.style.transform = '';
            element.style.zIndex = '';
            element.style.fontSize = '12px';
            element.style.fontWeight = 'bold';
            element.style.color = 'white';
            element.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
            element.style.background = '';
            element.style.border = '';
            element.style.boxShadow = '';
            element.style.width = '20px';
            element.style.height = '20px';
            element.style.animation = '';
        });
    }
    
    // Highlight winning number (both table and wheel) - FIXED
    highlightWinningNumber(result) {
        // Clear previous highlights first
        this.clearWinningHighlight();
        
        // Find and highlight the winning number on betting table
        const winningSpot = document.querySelector(`[data-bet="${result}"][data-type="number"]`);
        if (winningSpot) {
            winningSpot.classList.add('winning-number');
            
            // Remove highlight after 20 seconds
            setTimeout(() => {
                winningSpot.classList.remove('winning-number');
            }, 20000);
        }
        
        // Find and highlight the winning number on wheel - IMPROVED
        const winningWheelNumber = this.wheelNumbers.find(wheelNum => wheelNum.number === result);
        if (winningWheelNumber) {
            const element = winningWheelNumber.element;
            
            // Apply winning styles directly via JavaScript for better control
            element.style.transform = 'scale(1.5)';
            element.style.zIndex = '100';
            element.style.fontSize = '16px';
            element.style.fontWeight = '900';
            element.style.color = '#FFD700';
            element.style.textShadow = `
                0 0 10px #FFD700,
                0 0 20px #FFD700,
                0 0 30px #FFD700,
                0 0 40px #FFD700,
                2px 2px 4px rgba(0,0,0,1)
            `;
            element.style.background = 'radial-gradient(circle, rgba(255,215,0,0.9), rgba(255,215,0,0.3))';
            element.style.borderRadius = '50%';
            element.style.width = '30px';
            element.style.height = '30px';
            element.style.border = '3px solid #FFD700';
            element.style.boxShadow = `
                0 0 15px rgba(255, 215, 0, 1),
                0 0 25px rgba(255, 215, 0, 0.8),
                0 0 35px rgba(255, 215, 0, 0.6),
                inset 0 0 15px rgba(255, 255, 255, 0.8)
            `;
            
            // Add CSS class for animation
            element.classList.add('winning-wheel-number');
            
            // Create pulsing animation effect
            let scaleDirection = 1;
            let currentScale = 1.5;
            const pulseInterval = setInterval(() => {
                if (scaleDirection === 1) {
                    currentScale += 0.1;
                    if (currentScale >= 1.8) scaleDirection = -1;
                } else {
                    currentScale -= 0.1;
                    if (currentScale <= 1.5) scaleDirection = 1;
                }
                element.style.transform = `scale(${currentScale})`;
            }, 100);
            
            // Remove highlight and animation after 20 seconds
            setTimeout(() => {
                clearInterval(pulseInterval);
                element.classList.remove('winning-wheel-number');
                // Reset styles
                element.style.transform = '';
                element.style.zIndex = '';
                element.style.fontSize = '12px';
                element.style.fontWeight = 'bold';
                element.style.color = 'white';
                element.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)';
                element.style.background = '';
                element.style.border = '';
                element.style.boxShadow = '';
                element.style.width = '20px';
                element.style.height = '20px';
            }, 20000);
        }
    }
    
    getTotalBetAmount() {
        return Object.values(this.currentBets).reduce((total, bet) => total + bet.amount, 0);
    }
    
    updateBetsList() {
        const betsList = document.getElementById('betsList');
        
        if (Object.keys(this.currentBets).length === 0) {
            betsList.innerHTML = '<p class="no-bets">No bets placed</p>';
            return;
        }
        
        betsList.innerHTML = '';
        Object.entries(this.currentBets).forEach(([betKey, bet]) => {
            const betItem = document.createElement('div');
            betItem.className = 'bet-item';
            betItem.innerHTML = `
                <span>${this.formatBetName(betKey)}</span>
                <span>$${bet.amount}</span>
            `;
            betsList.appendChild(betItem);
        });
    }
    
    formatBetName(betKey) {
        if (!isNaN(betKey)) return `Number ${betKey}`;
        
        const nameMap = {
            'red': 'Red',
            'black': 'Black',
            'even': 'Even',
            'odd': 'Odd',
            '1-18': '1-18',
            '19-36': '19-36',
            '1st12': '1st Dozen',
            '2nd12': '2nd Dozen',
            '3rd12': '3rd Dozen',
            'col1': 'Column 1',
            'col2': 'Column 2',
            'col3': 'Column 3'
        };
        
        return nameMap[betKey] || betKey;
    }
    
    spin() {
        if (this.isSpinning) return;
        
        this.isSpinning = true;
        const spinBtn = document.getElementById('spinBtn');
        spinBtn.disabled = true;
        spinBtn.textContent = 'SPINNING...';
        
        // Clear previous winning highlights
        this.clearWinningHighlight();
        
        // Generate random result
        const result = Math.floor(Math.random() * 37); // 0-36
        
        // Calculate wheel rotation with consistent speed
        const wheelOrder = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
        const resultIndex = wheelOrder.indexOf(result);
        const degreesPerSlot = 360 / wheelOrder.length;
        const resultAngle = resultIndex * degreesPerSlot;
        
        // Initialize current rotation tracking if not exists
        if (!this.currentRotation) {
            this.currentRotation = 0;
        }
        
        // Always spin exactly 5 full rotations (1800 degrees) plus the result position
        const totalSpinDegrees = 1800; // Exactly 5 full rotations
        const finalAngle = this.currentRotation + totalSpinDegrees + (360 - resultAngle % 360);
        
        // Update current rotation for next spin
        this.currentRotation = finalAngle % 360;
        
        const wheel = document.getElementById('wheel');
        
        // Reset transition to ensure consistent animation
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${this.currentRotation - totalSpinDegrees - (360 - resultAngle)}deg)`;
        
        // Force reflow to apply the reset
        wheel.offsetHeight;
        
        // Apply the consistent spin animation (exactly 4 seconds)
        wheel.style.transition = 'transform 4.0s cubic-bezier(0.23, 1, 0.320, 1)';
        wheel.style.transform = `rotate(${finalAngle}deg)`;
        
        // Play spin sound
        this.sounds.wheelSpin();
        
        // Add ball bouncing sounds during spin with consistent timing
        const bounceIntervals = [];
        for (let i = 1; i <= 8; i++) {
            bounceIntervals.push(setTimeout(() => {
                this.sounds.ballBounce();
            }, i * 400));
        }
        
        // Show result after exact spin duration (4 seconds)
        setTimeout(() => {
            // Play ball drop sound
            this.sounds.ballDrop();
            
            // Add a small delay before processing result to ensure wheel stops completely
            setTimeout(() => {
                this.processResult(result);
                this.isSpinning = false;
                spinBtn.disabled = false;
                spinBtn.textContent = 'SPIN';
            }, 500);
        }, 4000); // Changed to exactly match animation duration
    }
    
    processResult(result) {
        this.lastResult = result;
        this.history.unshift(result);
        if (this.history.length > 10) {
            this.history.pop();
        }
        
        // HIGHLIGHT THE WINNING NUMBER (both table and wheel) - DELAY FOR BETTER EFFECT
        setTimeout(() => {
            this.highlightWinningNumber(result);
        }, 200); // Small delay to ensure wheel has stopped
        
        const color = this.rouletteNumbers[result];
        let totalWinnings = 0;
        let winningBets = [];
        const totalBetAmount = this.getTotalBetAmount();
        
        // Deduct all bet amounts from balance first
        this.balance -= totalBetAmount;
        
        // Check each bet for winnings
        Object.entries(this.currentBets).forEach(([betKey, bet]) => {
            const winAmount = this.checkWin(betKey, bet.type, result);
            if (winAmount > 0) {
                totalWinnings += winAmount;
                winningBets.push({
                    bet: betKey,
                    amount: winAmount
                });
            }
        });
        
        // Add winnings to balance
        this.balance += totalWinnings;
        
        // Calculate net result (winnings minus total bet)
        const netResult = totalWinnings - totalBetAmount;
        
        // Show result message
        if (totalWinnings > 0) {
            const netMessage = netResult > 0 ? `Net win: $${netResult}` : `Net loss: $${Math.abs(netResult)}`;
            this.showMessage(`Number ${result} (${color.toUpperCase()})!\nWon: $${totalWinnings}\n${netMessage}`, netResult > 0 ? 'win' : 'lose');
            
            // Play appropriate sound
            if (netResult > 0) {
                this.sounds.win();
            } else {
                this.sounds.lose();
            }
        } else {
            this.showMessage(`Number ${result} (${color.toUpperCase()})!\nLost: $${totalBetAmount}`, 'lose');
            this.sounds.lose();
        }
        
        // Clear bets and update display
        this.clearAllBets();
        this.updateDisplay();
        this.updateHistory();
    }
    
    checkWin(betKey, betType, result) {
        const color = this.rouletteNumbers[result];
        const bet = this.currentBets[betKey];
        
        switch (betType) {
            case 'number':
                if (parseInt(betKey) === result) {
                    return bet.amount * (this.payouts.number + 1); // +1 to include original bet
                }
                break;
                
            case 'color':
                if (betKey === color) {
                    return bet.amount * (this.payouts.color + 1);
                }
                break;
                
            case 'even':
                if (result !== 0 && result % 2 === 0) {
                    return bet.amount * (this.payouts.even + 1);
                }
                break;
                
            case 'odd':
                if (result !== 0 && result % 2 === 1) {
                    return bet.amount * (this.payouts.odd + 1);
                }
                break;
                
            case 'range':
                if (betKey === '1-18' && result >= 1 && result <= 18) {
                    return bet.amount * (this.payouts.range + 1);
                }
                if (betKey === '19-36' && result >= 19 && result <= 36) {
                    return bet.amount * (this.payouts.range + 1);
                }
                break;
                
            case 'dozen':
                if (betKey === '1st12' && result >= 1 && result <= 12) {
                    return bet.amount * (this.payouts.dozen + 1);
                }
                if (betKey === '2nd12' && result >= 13 && result <= 24) {
                    return bet.amount * (this.payouts.dozen + 1);
                }
                if (betKey === '3rd12' && result >= 25 && result <= 36) {
                    return bet.amount * (this.payouts.dozen + 1);
                }
                break;
                
            case 'column':
                const column1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
                const column2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
                const column3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
                
                if (betKey === 'col1' && column1.includes(result)) {
                    return bet.amount * (this.payouts.column + 1);
                }
                if (betKey === 'col2' && column2.includes(result)) {
                    return bet.amount * (this.payouts.column + 1);
                }
                if (betKey === 'col3' && column3.includes(result)) {
                    return bet.amount * (this.payouts.column + 1);
                }
                break;
        }
        
        return 0;
    }
    
    updateDisplay() {
        document.getElementById('balance').textContent = this.balance;
        document.getElementById('totalBet').textContent = this.getTotalBetAmount();
        document.getElementById('lastResult').textContent = 
            this.lastResult !== null ? `${this.lastResult} (${this.rouletteNumbers[this.lastResult].toUpperCase()})` : '-';
        
        // Update bet amount input max value
        document.getElementById('betAmount').max = this.balance;
        
        // Check if player is out of money
        if (this.balance <= 0 && this.getTotalBetAmount() === 0) {
            this.showMessage('Game Over! You are out of money.\nRefresh to start over.', 'lose');
            
            // Disable betting when out of money
            document.querySelectorAll('.bet-spot').forEach(spot => {
                spot.style.pointerEvents = 'none';
                spot.style.opacity = '0.5';
            });
            
            document.getElementById('spinBtn').disabled = true;
        }
    }
    
    updateHistory() {
        const historyContainer = document.getElementById('history');
        historyContainer.innerHTML = '';
        
        this.history.forEach(num => {
            const historyNum = document.createElement('div');
            historyNum.className = `history-number ${this.rouletteNumbers[num]}`;
            historyNum.textContent = num;
            historyContainer.appendChild(historyNum);
        });
    }
    
    showMessage(message, type) {
        const messageElement = document.getElementById('gameMessage');
        messageElement.textContent = message;
        messageElement.className = `game-message ${type} show`;
        
        setTimeout(() => {
            messageElement.classList.remove('show');
        }, 4000);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new RouletteGame();
    
    // Add some helpful keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !game.isSpinning && game.getTotalBetAmount() > 0) {
            e.preventDefault();
            game.spin();
        }
        
        if (e.code === 'Escape' && !game.isSpinning) {
            game.clearAllBets();
        }
        
        // Quick bet amounts with number keys
        if (e.code >= 'Digit1' && e.code <= 'Digit5' && e.altKey) {
            e.preventDefault();
            const amounts = [5, 10, 25, 50, 100];
            const index = parseInt(e.code.slice(-1)) - 1;
            if (amounts[index]) {
                document.getElementById('betAmount').value = amounts[index];
            }
        }
    });
    
    // Add restart button when game is over
    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'Restart Game';
    restartBtn.style.position = 'fixed';
    restartBtn.style.top = '20px';
    restartBtn.style.right = '20px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.style.background = '#4CAF50';
    restartBtn.style.color = 'white';
    restartBtn.style.border = 'none';
    restartBtn.style.borderRadius = '5px';
    restartBtn.style.cursor = 'pointer';
    restartBtn.style.fontSize = '14px';
    restartBtn.style.fontWeight = 'bold';
    restartBtn.style.zIndex = '1000';
    
    restartBtn.addEventListener('click', () => {
        location.reload();
    });
    
    document.body.appendChild(restartBtn);
    
    // Add game instructions
    const instructions = document.createElement('div');
    instructions.style.position = 'fixed';
    instructions.style.bottom = '20px';
    instructions.style.right = '20px';
    instructions.style.background = 'rgba(0,0,0,0.8)';
    instructions.style.color = 'white';
    instructions.style.padding = '10px';
    instructions.style.borderRadius = '5px';
    instructions.style.fontSize = '0.8rem';
    instructions.style.maxWidth = '200px';
    instructions.innerHTML = `
        <strong>Controls:</strong><br>
        • Click betting spots to place bets<br>
        • Space: Spin wheel<br>
        • Escape: Clear bets<br>
        • Alt+1-5: Quick bet amounts<br>
        • Click 🔊 to toggle sound
    `;
    document.body.appendChild(instructions);
    
    // Auto-hide instructions after 10 seconds
    setTimeout(() => {
        instructions.style.opacity = '0.3';
    }, 10000);
});