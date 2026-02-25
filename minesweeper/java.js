
    (function() {
        // KONFIGURACE
        const BOARD_SIZE = 5;
        const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;
        const WIN_REWARD_PER_DIAMOND = 25;   // za každý odkrytý diamant
        const BOMB_PENALTY = 500;             // ztráta při bombě

        // Stav proměnných
        let board = [];
        let bombCount = 3;
        let gameActive = true;
        let revealedCount = 0;
        let safeCellsToWin = 0;
        let coins = 10000;                     // startovací peníze

        // DOM elementy
        const boardEl = document.getElementById('board');
        const bombDisplay = document.getElementById('bombDisplay');
        const bombOptions = document.querySelectorAll('.bomb-option');
        const coinDisplay = document.getElementById('coinDisplay');
        const winPerDiamondSpan = document.getElementById('winPerDiamond');
        const newGameBtn = document.getElementById('newGameBtn');
        const resetBoardBtn = document.getElementById('resetBoardBtn');
        const betInput = document.getElementById('betInput');
        const minBet = document.getElementById('minBet');
        const maxBet = document.getElementById('maxBet');
        const gameOverMsg = document.getElementById('gameOverMsg');

        // Pomocné funkce
        function updateUI() {
            coinDisplay.textContent = Math.floor(coins);
            bombDisplay.textContent = bombCount;
            winPerDiamondSpan.textContent = '+' + WIN_REWARD_PER_DIAMOND;
        }

        // Ověří, zda hráč může hrát (kladný zůstatek)
        function canPlay() {
            return coins >= 5; // minimální sázka je 5, ale kontrolujeme až při kliku
        }

        // Zobrazí zprávu o konci hry
        function setGameOverMessage(active) {
            if (!active) {
                gameOverMsg.textContent = '❌ Nemáš dost coinů! Zvyš sázku nebo resetuj pole (tlačítko ↻ pole) a zkus to znovu.';
            } else {
                gameOverMsg.textContent = '';
            }
        }

        // Inicializace pole (podle bombCount, zachovává coins)
        function initBoard(resetCoins = false) {
            if (resetCoins) coins = 10000; // pouze při úplném resetu z reset ikony (ale to řešíme zvlášť)

            board = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                let row = [];
                for (let c = 0; c < BOARD_SIZE; c++) {
                    row.push({
                        bomb: false,
                        revealed: false,
                        flag: false
                    });
                }
                board.push(row);
            }

            // Rozmístit bomby
            let bombsPlaced = 0;
            let maxBombs = Math.min(bombCount, TOTAL_CELLS);
            while (bombsPlaced < maxBombs) {
                let r = Math.floor(Math.random() * BOARD_SIZE);
                let c = Math.floor(Math.random() * BOARD_SIZE);
                if (!board[r][c].bomb) {
                    board[r][c].bomb = true;
                    bombsPlaced++;
                }
            }

            bombCount = maxBombs; // aktualizace (kvůli 24)
            safeCellsToWin = TOTAL_CELLS - bombCount;
            gameActive = true;
            revealedCount = 0;

            // Pokud hráč nemá peníze, hra není aktivní (nemůže klikat)
            if (coins < 5) {
                gameActive = false;
                setGameOverMessage(false);
            } else {
                setGameOverMessage(true);
            }

            updateUI();
            renderBoard();
        }

        // Vykreslení pole
        function renderBoard() {
            boardEl.innerHTML = '';
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const cell = board[r][c];
                    const cellDiv = document.createElement('div');
                    cellDiv.className = 'cell';

                    if (cell.revealed) {
                        cellDiv.classList.add('revealed');
                        if (cell.bomb) {
                            cellDiv.classList.add('bomb');
                            cellDiv.textContent = '💣';
                        } else {
                            cellDiv.classList.add('diamond');
                            const diamondSpan = document.createElement('span');
                            diamondSpan.className = 'diamond-symbol';
                            diamondSpan.textContent = '💎';
                            cellDiv.appendChild(diamondSpan);
                        }
                    } else {
                        if (cell.flag) {
                            cellDiv.classList.add('flag');
                        }
                    }

                    cellDiv.dataset.row = r;
                    cellDiv.dataset.col = c;
                    cellDiv.addEventListener('click', onCellClick);
                    cellDiv.addEventListener('contextmenu', onRightClick);
                    boardEl.appendChild(cellDiv);
                }
            }
        }

        // Klik na políčko
        function onCellClick(e) {
            if (!gameActive) return;
            // Ověříme, zda má hráč dost peněz (minimálně 5)
            if (coins < 5) {
                gameActive = false;
                setGameOverMessage(false);
                renderBoard(); // překreslí (odstraní možnost klikat dál)
                return;
            }

            const row = parseInt(e.currentTarget.dataset.row);
            const col = parseInt(e.currentTarget.dataset.col);
            const cell = board[row][col];
            if (cell.revealed) return;
            if (cell.flag) return;

            // stržení sázky za každý klik (hodnota z inputu)
            let betAmount = parseInt(betInput.value);
            if (isNaN(betAmount) || betAmount < 5) betAmount = 5;
            if (betAmount > 100) betAmount = 100;
            if (betAmount > coins) betAmount = coins; // nemůže vsadit víc než má

            if (coins < betAmount) {
                alert('Nemáš dost coinů na tuto sázku.');
                return;
            }

            // Prohra při bombě
            if (cell.bomb) {
                cell.revealed = true;
                gameActive = false;
                coins -= betAmount; // prohraješ sázku
                if (coins < 0) coins = 0;
                revealAllBombs();   // odkryje všechny bomby
                newGameBtn.disabled = false; // můžeme dát novou hru
                updateUI();
                if (coins < 5) setGameOverMessage(false);
                return;
            }

            // Bezpečné políčko (diamant) - strhneme sázku? Tady jsme ji už strhli, ale za diamant odměníme
            coins -= betAmount;   // zaplacení sázky za klik
            // Odkrytí diamantu
            revealCell(row, col);
            // Odměna za diamant (čistý zisk = WIN_REWARD_PER_DIAMANT - sázka, ale sázka už je pryč, takže přičteme odměnu)
            coins += WIN_REWARD_PER_DIAMOND;  

            // Pokud hráč zůstal pod 5, hra se ukončí
            if (coins < 5) {
                gameActive = false;
                setGameOverMessage(false);
            }

            updateUI();

            // Kontrola výhry (odkryty všechny nebombové)
            if (revealedCount === safeCellsToWin && gameActive) {
                gameActive = false;
                coins += 500; // bonus za dobytí všech diamantů
                alert('🎉 Trefil jsi všechny diamanty! Bonus 500 coinů!');
                newGameBtn.disabled = false;
                updateUI();
            }
        }

        function revealCell(row, col) {
            if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
            const cell = board[row][col];
            if (cell.revealed) return;
            if (cell.flag) return;
            if (cell.bomb) return;

            cell.revealed = true;
            revealedCount++;
            // Žádný flood fill – každý diamant zvlášť (čistě náhoda)
        }

        function revealAllBombs() {
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    if (board[r][c].bomb) {
                        board[r][c].revealed = true;
                    }
                }
            }
            renderBoard();
        }

        // Pravé tlačítko – vlajka
        function onRightClick(e) {
            e.preventDefault();
            if (!gameActive) return;
            const row = parseInt(e.currentTarget.dataset.row);
            const col = parseInt(e.currentTarget.dataset.col);
            const cell = board[row][col];
            if (cell.revealed) return;
            cell.flag = !cell.flag;
            renderBoard();
        }

        // Výběr bomb
        bombOptions.forEach(opt => {
            opt.addEventListener('click', function() {
                bombOptions.forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
                bombCount = parseInt(this.dataset.bombs);
                initBoard(); // nové pole se stejným coinem
                newGameBtn.disabled = false;
            });
        });

        // Nová hra (cashout tlačítko) – obnoví pouze pole, peníze zůstávají
        newGameBtn.addEventListener('click', function() {
            initBoard(); // reset pole, coins beze změny
            if (coins < 5) gameActive = false;
            setGameOverMessage(gameActive);
        });

        // Reset pole (resetBoardBtn) – obnoví pouze pole, peníze se nemění (ani na 10000)
        resetBoardBtn.addEventListener('click', function() {
            // Uložíme coins, ale pole se vygeneruje znovu
            let currentCoins = coins;
            initBoard();
            coins = currentCoins; // coins se nezmění
            if (coins < 5) gameActive = false;
            setGameOverMessage(gameActive);
            updateUI();
            renderBoard();
        });

        // MIN a MAX tlačítka
        minBet.addEventListener('click', function() {
            betInput.value = 5;
        });
        maxBet.addEventListener('click', function() {
            betInput.value = 100;
        });
        // Omezení vstupu
        betInput.addEventListener('change', function() {
            let val = parseInt(betInput.value);
            if (isNaN(val) || val < 5) betInput.value = 5;
            if (val > 100) betInput.value = 100;
        });

        // Zablokovat kontextové menu
        document.querySelector('.game-container').addEventListener('contextmenu', e => e.preventDefault());

        // Start
        initBoard();
        updateUI();
    })();
