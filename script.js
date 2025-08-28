// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentPair = 'BTC/USDT';
let currentTimeframe = '1';
let tradingViewWidget = null;
let indicatorsVisible = false;
let marketData = [];
let allMarketData = [];
let currentMarketFilter = 'normal';
let tickerData = [];
let orderBookData = { bids: [], asks: [] };
let socket = null;
let priceUpdateInterval = null;
let user = null;
let portfolio = [];
let orders = [];
let notifications = [];
let tickerScrollInterval = null;
let isTickerScrolling = true;
let marketDataUpdateInterval = null;


// DOM Elements
const [base, quote] = currentPair.split('/');
const symbol = `BYBIT:${base}${quote}`;
const MARKET_DATA_UPDATE_INTERVAL = 5000;
const menuBtn = document.getElementById('menuBtn');
const menuCloseBtn = document.getElementById('menuCloseBtn');
const mobileMenu = document.getElementById('mobileMenu');
const body = document.body;
const tickerTape = document.getElementById('tickerTape');
const marketTableBody = document.getElementById('marketTableBody');
const chartPairElement = document.getElementById('chartPair');
const orderBookPairElement = document.getElementById('orderBookPair');
const orderBookAsks = document.getElementById('orderBookAsks');
const orderBookBids = document.getElementById('orderBookBids');
const lastPriceElement = document.getElementById('lastPrice');
const orderActionElement = document.getElementById('orderAction');
const orderAmountCurrencyElement = document.getElementById('orderAmountCurrency');
const priceGroupElement = document.getElementById('priceGroup');
const orderForm = document.getElementById('orderForm');
const buyBtn = document.getElementById('buyBtn');
const sellBtn = document.getElementById('sellBtn');
const availableBalanceElement = document.getElementById('availableBalance');
const authModal = document.getElementById('authModal');
const authCloseBtn = document.getElementById('authCloseBtn');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const forgotTab = document.getElementById('forgotTab');
const supportTab = document.getElementById('supportTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotForm = document.getElementById('forgotForm');
const supportForm = document.getElementById('supportForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const forgotError = document.getElementById('forgotError');
const supportError = document.getElementById('supportError');
const userAvatar = document.getElementById('userAvatar');
const mainContent = document.getElementById('mainContent');
const dashboardSection = document.getElementById('dashboardSection');
const tradeSection = document.getElementById('tradeSection');
const marketSection = document.getElementById('marketSection');
const portfolioSection = document.getElementById('portfolioSection');
const ordersSection = document.getElementById('ordersSection');
const portfolioTableBody = document.getElementById('portfolioTableBody');
const ordersTableBody = document.getElementById('ordersTableBody');
const depositBtn = document.getElementById('depositBtn');
const withdrawBtn = document.getElementById('withdrawBtn');
const exchangeBtn = document.getElementById('exchangeBtn');
const notificationBadge = document.getElementById('notificationBadge');
const notificationsBtn = document.getElementById('notificationsBtn');
const notificationPanel = document.createElement('div');
notificationPanel.className = 'notification-panel';
notificationPanel.innerHTML = `
    <div class="notification-header">
        <div class="notification-title">Notifications</div>
        <div class="notification-clear">Clear All</div>
    </div>
    <div class="notification-list" id="notificationList"></div>
`;

document.body.appendChild(notificationPanel);

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize preloader
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('preloaderProgress');
    const appContainer = document.getElementById('appContainer');
    let progress = 0;

    const loadingInterval = setInterval(() => {
        progress += Math.random() * 40;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // Start the slide-up animation
            preloader.classList.add('hiding');
            appContainer.classList.add('loaded');
            
            // Remove preloader from DOM after animation completes
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 800);
        }
        progressBar.style.width = progress + '%';
    }, 200);

    initAuth();
    initMenu();
    initEventListeners();
    fetchMarketData();
    
    // Initialize TradingView after a slight delay to ensure DOM is ready
    setTimeout(() => {

        const [base, quote] = currentPair.split('/');
        const symbol = `BYBIT:${base}${quote}`;
        
        tradingViewWidget = new TradingView.widget({
            symbol: 'BYBIT:BTCUSDT',
            interval: currentTimeframe,
            container_id: 'tv-chart',
            autosize: true,
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#0a1120',
            enable_publishing: false,
            hide_top_toolbar: true,
            hide_side_toolbar: true,
            allow_symbol_change: false,
            details: indicatorsVisible,
            hotlist: false,
            calendar: true,
            studies: indicatorsVisible ? [
                'Volume@tv-basicstudies',
                'Stochastic@tv-basicstudies',
                'MACD@tv-basicstudies',
                'RSI@tv-basicstudies',
                'Bollinger_Bands@tv-basicstudies'
            ] : [],            
            overrides: {
                'paneProperties.background': '#0a1120',
                'paneProperties.vertGridProperties.color': '#1e293b',
                'paneProperties.horzGridProperties.color': '#1e293b',
                'symbolWatermarkProperties.transparency': 90,
                'scalesProperties.textColor': '#94a3b8',
                'mainSeriesProperties.candleStyle.upColor': '#10b981',
                'mainSeriesProperties.candleStyle.downColor': '#ef4444',
                'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
                'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
                'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
                'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444'
            }
        });
    }, 500);
    
    // Initialize WebSocket after market data is loaded
    setTimeout(initWebSocket, 1000);
    
    auth.onAuthStateChanged(user => {
        if (user) {
            handleUserLogin(user);
        } else {
            handleUserLogout();
        }
    });
});

// Initialize authentication
function initAuth() {
    if (!auth.currentUser) {
        authModal.classList.add('active');
    }
    
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        forgotTab.classList.remove('active');
        supportTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        forgotForm.style.display = 'none';
        supportForm.style.display = 'none';
    });
    
    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        forgotTab.classList.remove('active');
        supportTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
        forgotForm.style.display = 'none';
        supportForm.style.display = 'none';
    });
    
    forgotTab.addEventListener('click', () => {
        forgotTab.classList.add('active');
        loginTab.classList.remove('active');
        registerTab.classList.remove('active');
        supportTab.classList.remove('active');
        forgotForm.style.display = 'block';
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        supportForm.style.display = 'none';
    });

    supportTab.addEventListener('click', () => {
        supportTab.classList.add('active');
        loginTab.classList.remove('active');
        registerTab.classList.remove('active');
        forgotTab.classList.remove('active');
        supportForm.style.display = 'block';
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        forgotForm.style.display = 'none';
    });

    authCloseBtn.addEventListener('click', () => {
        closeAuthModal();
    });

    // Close modal on outside click
    function closeAuthModal() {
        authModal.classList.add('closing');
        
        setTimeout(() => {
            authModal.classList.remove('active', 'closing');
        }, 700);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            closeAuthModal();
        } catch (error) {
            loginError.textContent = error.message;
        }
    });
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        if (password !== confirmPassword) {
            registerError.textContent = 'Passwords do not match';
            return;
        }
        
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(userCredential.user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                balance: 10000,
                portfolio: {}
            });
            closeAuthModal();
        } catch (error) {
            registerError.textContent = error.message;
        }
    });

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgotEmail').value;
        
        try {
            await auth.sendPasswordResetEmail(email);
            showModal('Password Reset', 'Check your inbox. A password reset email has been sent to ' + email);
            closeAuthModal();
        } catch (error) {
            forgotError.textContent = error.message;
        }
    });

    supportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('supportEmail').value;
        const subject = document.getElementById('supportSubject').value;
        const message = document.getElementById('supportMessage').value;
        
        try {
            // In a real app, you would send this to your backend
            // For now, we'll just show a success message
            showModal('Support Request Submitted', 'Your support request has been submitted successfully. We will contact you soon at ' + email);
            supportForm.reset();
            closeAuthModal();
        } catch (error) {
            supportError.textContent = 'Failed to submit support request. Please try again.';
        }
    });
}

// Handle user login
function handleUserLogin(user) {
    user = user;
    userAvatar.textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
    
    loadUserData();
    
    document.querySelectorAll('.mobile-menu-avatar').forEach(el => {
        el.textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase();
    });
    
    document.querySelectorAll('.mobile-menu-user-info h3').forEach(el => {
        el.textContent = user.displayName || user.email;
    });
}

// Handle user logout
function handleUserLogout() {
    user = null;
    authModal.classList.add('active');
    userAvatar.innerHTML = '<i class="fas fa-user"></i>';
    
    document.querySelectorAll('.mobile-menu-avatar').forEach(el => {
        el.textContent = 'GU';
    });
    
    document.querySelectorAll('.mobile-menu-user-info h3').forEach(el => {
        el.textContent = 'Guest User';
    });
}

// Load user data
async function loadUserData() {
    if (!user) return;
    
    const portfolioDoc = await db.collection('users').doc(user.uid).get();
    portfolio = portfolioDoc.data().portfolio || {};
    
    const ordersSnapshot = await db.collection('users').doc(user.uid).collection('orders')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const notificationsSnapshot = await db.collection('users').doc(user.uid).collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
    notifications = notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    updatePortfolioTable();
    updateOrdersTable();
    updateNotifications();
}

// Initialize mobile menu
function initMenu() {
    menuBtn.addEventListener('click', toggleMenu);
    menuCloseBtn.addEventListener('click', toggleMenu);
    
    document.addEventListener('click', (e) => {
        if (body.classList.contains('menu-open')) {
            if (!mobileMenu.contains(e.target) && e.target !== menuBtn) {
                toggleMenu();
            }
        }
    });
}

function toggleMenu() {
    mobileMenu.classList.toggle('open');
    body.classList.toggle('menu-open');
}

// Initialize event listeners
function initEventListeners() {
    // Timeframe button handlers
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTimeframe = this.dataset.timeframe;
            updateTradingViewChart();
        });
    });

    document.getElementById('indicatorsToggle').addEventListener('change', function() {
        indicatorsVisible = this.checked;
        toggleIndicators();
        
        const toggleText = document.querySelector('.toggle-text');
        if (indicatorsVisible) {
            toggleText.style.color = 'var(--text-primary)';
        } else {
            toggleText.style.color = 'var(--text-secondary)';
        }
    });

    initMarketFilters();

    document.querySelectorAll('.order-tab[data-type]').forEach(tab => {
        tab.addEventListener('click', function() {
            if (this.classList.contains('active')) return;
            
            document.querySelectorAll('.order-tab[data-type]').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const orderType = this.dataset.type;
            if (orderType === 'market') {
                priceGroupElement.style.display = 'none';
            } else {
                priceGroupElement.style.display = 'flex';
            }
        });
    });

    buyBtn.addEventListener('click', placeOrder.bind(null, 'buy'));
    sellBtn.addEventListener('click', placeOrder.bind(null, 'sell'));
    

    document.querySelectorAll('.percent-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // remove active state
            document.querySelectorAll('.percent-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const percent = parseInt(btn.dataset.percent, 10);
            const balance = 1000; // example: fetch user balance dynamically
            const amount = (balance * percent) / 100;

            document.getElementById('orderTotal').value = amount.toFixed(2);
        });
    });

    document.querySelectorAll('.nav-item, .mobile-menu-item').forEach(item => {
        if (item.id !== 'logoutBtn') {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.dataset.page;
                navigateTo(page);
            });
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        auth.signOut();
    });
    
    depositBtn.addEventListener('click', showDepositModal);
    withdrawBtn.addEventListener('click', showWithdrawModal);
    exchangeBtn.addEventListener('click', showExchangeModal);
    
    notificationsBtn.addEventListener('click', toggleNotifications);
    
    document.getElementById('searchBtn').addEventListener('click', showSearchModal);
    
    // Ticker tape events
    tickerTape.addEventListener('mouseenter', pauseTickerScroll);
    tickerTape.addEventListener('mouseleave', resumeTickerScroll);
    tickerTape.addEventListener('scroll', handleTickerScroll);
}

// Ticker tape scrolling functions
function startTickerScroll() {
    if (tickerScrollInterval) clearInterval(tickerScrollInterval);
    
    // Clone all ticker items to create seamless infinite scroll
    const items = Array.from(tickerTape.children);
    items.forEach(item => {
        const clone = item.cloneNode(true);
        tickerTape.appendChild(clone);
    });
    
    let scrollPos = 0;
    const scrollSpeed = 550;
    const itemWidth = items[0]?.offsetWidth || 120;
    
    tickerScrollInterval = setInterval(() => {
        if (isTickerScrolling) {
            scrollPos += scrollSpeed;
            tickerTape.scrollLeft = scrollPos;
            
            // Reset to start when reaching halfway (since we cloned the items)
            if (scrollPos >= itemWidth * items.length) {
                scrollPos = 0;
                tickerTape.scrollLeft = 0;
            }
        }
    }, 30);
}

function pauseTickerScroll() {
    isTickerScrolling = false;
}

function resumeTickerScroll() {
    isTickerScrolling = true;
}

function handleTickerScroll() {
    pauseTickerScroll();
    setTimeout(resumeTickerScroll, 5000);
}

// Navigation function
function navigateTo(page) {
    document.querySelectorAll('main > section').forEach(section => {
        section.style.display = 'none';
    });
    
    if (page === 'home') {
        dashboardSection.style.display = 'block';
    } else if (page === 'markets') {
        marketSection.style.display = 'block';
    } else if (page === 'trade') {
        document.querySelector('.market-overview').style.display = 'block';
        tradeSection.style.display = 'grid';
        ordersSection.style.display = 'block';
    } else if (page === 'portfolio') {
        portfolioSection.style.display = 'block';
    } else if (page === 'orders') {
        document.querySelector('.market-overview').style.display = 'block';
        ordersSection.style.display = 'block';
    }
    
    document.querySelectorAll('.nav-item, .mobile-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    document.title = `NexusPro | ${page.charAt(0).toUpperCase() + page.slice(1)}`;
    
    if (body.classList.contains('menu-open')) {
        toggleMenu();
    }
}

// Update TradingView chart
function updateTradingViewChart() {    
    if (!tradingViewWidget) {
        console.error('TradingView widget not initialized');
        return;
    }
    
    // Get the current symbol based on the selected pair
    const [base, quote] = currentPair.split('/');
    const symbol = `BYBIT:${base}${quote}`;

    // Remove the existing widget
    document.getElementById('tv-chart').innerHTML = '';
    
    tradingViewWidget = new TradingView.widget({
        symbol: symbol,
        interval: currentTimeframe,
        container_id: 'tv-chart',
        autosize: true,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0a1120',
        enable_publishing: false,
        hide_top_toolbar: true,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        details: indicatorsVisible,
        hotlist: false,
        calendar: true,
        studies: indicatorsVisible ? [
            'Volume@tv-basicstudies',
            'Stochastic@tv-basicstudies',
            'MACD@tv-basicstudies',
            'RSI@tv-basicstudies',
            'Bollinger_Bands@tv-basicstudies'
        ] : [],
        overrides: {
            'paneProperties.background': '#0a1120',
            'paneProperties.vertGridProperties.color': '#1e293b',
            'paneProperties.horzGridProperties.color': '#1e293b',
            'symbolWatermarkProperties.transparency': 90,
            'scalesProperties.textColor': '#94a3b8',
            'mainSeriesProperties.candleStyle.upColor': '#10b981',
            'mainSeriesProperties.candleStyle.downColor': '#ef4444',
            'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
            'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444'
        }
    });
}

// Function for toggle indicators
function toggleIndicators() {
    if (tradingViewWidget) {
        document.getElementById('tv-chart').innerHTML = '';
        
        // Get the current symbol based on the selected pair
        const [base, quote] = currentPair.split('/');
        const symbol = `BYBIT:${base}${quote}`;
        
        tradingViewWidget = new TradingView.widget({
            symbol: `BYBIT:${currentPair.replace('/', '')}`,
            interval: currentTimeframe,
            container_id: 'tv-chart',
            autosize: true,
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#0a1120',
            enable_publishing: false,
            hide_top_toolbar: true,
            hide_side_toolbar: true,
            allow_symbol_change: false,
            details: indicatorsVisible,
            hotlist: false,
            calendar: true,
            studies: indicatorsVisible ? [
                'Volume@tv-basicstudies',
                'Stochastic@tv-basicstudies',
                'MACD@tv-basicstudies',
                'RSI@tv-basicstudies',
                'Bollinger_Bands@tv-basicstudies'
            ] : [],
            overrides: {
                'paneProperties.background': '#0a1120',
                'paneProperties.vertGridProperties.color': '#1e293b',
                'paneProperties.horzGridProperties.color': '#1e293b',
                'symbolWatermarkProperties.transparency': 90,
                'scalesProperties.textColor': '#94a3b8',
                'mainSeriesProperties.candleStyle.upColor': '#10b981',
                'mainSeriesProperties.candleStyle.downColor': '#ef4444',
                'mainSeriesProperties.candleStyle.borderUpColor': '#10b981',
                'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
                'mainSeriesProperties.candleStyle.wickUpColor': '#10b981',
                'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444'
            }
        });
    }
}

// Initialize WebSocket connection
function initWebSocket() {
    const [base, quote] = currentPair.split('/');
    const symbol = `${base}${quote}`.toLowerCase();
    
    if (socket) {
        socket.close();
    }
    
    // Connect to both depth and ticker streams
    socket = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@depth@100ms/${symbol}@ticker`);
    
    socket.onopen = () => {
        console.log('WebSocket connected for', symbol);
    };
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.e === 'depthUpdate') {
                // Process order book updates
                const bids = data.b.map(bid => [parseFloat(bid[0]), parseFloat(bid[1])]);
                const asks = data.a.map(ask => [parseFloat(ask[0]), parseFloat(ask[1])]);
                
                // Merge with existing order book
                const mergedBids = [...bids, ...orderBookData.bids]
                    .sort((a, b) => b[0] - a[0])
                    .slice(0, 10);
                const mergedAsks = [...asks, ...orderBookData.asks]
                    .sort((a, b) => a[0] - b[0])
                    .slice(0, 10);
                
                updateOrderBook({
                    bids: mergedBids,
                    asks: mergedAsks,
                    lastPrice: orderBookData.lastPrice,
                    spread: orderBookData.spread
                });
            } else if (data.e === '24hrTicker') {
                // Process price updates
                const lastPrice = parseFloat(data.c);
                const bestBid = parseFloat(data.b);
                const bestAsk = parseFloat(data.a);
                const spread = bestBid && bestAsk ? ((bestAsk - bestBid) / bestBid) * 100 : 0;
                
                updateOrderBook({
                    bids: orderBookData.bids,
                    asks: orderBookData.asks,
                    lastPrice: lastPrice,
                    spread: spread
                });
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };
    
    socket.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(initWebSocket, 3000);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Fetch market data
async function fetchMarketData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            console.error('Invalid market data format:', data);
            return;
        }

        // Preserve favorite status when updating
        const updatedMarketData = data.map(coin => {
            const existingCoin = marketData.find(c => c.id === coin.id);
            return {
                id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                image: coin.image,
                current_price: coin.current_price,
                price_change_percentage_24h: coin.price_change_percentage_24h,
                total_volume: coin.total_volume,
                market_cap: coin.market_cap,
                favorite: existingCoin ? existingCoin.favorite : false
            };
        });

        marketData = updatedMarketData;
        tickerData = marketData.slice(0, 18);
        
        renderMarketTable();
        renderTickerTape();
        
        // Only start ticker scroll if not already running
        if (!tickerScrollInterval) {
            startTickerScroll();
        }
        
    } catch (error) {
        console.error('Error fetching market data:', error);
        // Don't use mock data if we already have some data
        if (marketData.length === 0) {
            useMockMarketData();
        }
    }
}

// Use mock market data
function useMockMarketData() {
    const mockData = [
        {
            id: 'bitcoin',
            symbol: 'btc',
            name: 'Bitcoin',
            image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            current_price: 42850.12,
            price_change_percentage_24h: 2.34,
            total_volume: 1420000000,
            market_cap: 820500000000,
            favorite: true
        },
        {
            id: 'ethereum',
            symbol: 'eth',
            name: 'Ethereum',
            image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
            current_price: 2280.45,
            price_change_percentage_24h: 1.56,
            total_volume: 980000000,
            market_cap: 274000000000,
            favorite: false
        },
        {
            id: 'binancecoin',
            symbol: 'bnb',
            name: 'Binance Coin',
            image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
            current_price: 305.67,
            price_change_percentage_24h: -0.45,
            total_volume: 450000000,
            market_cap: 47000000000,
            favorite: true
        }
    ];

    marketData = mockData;
    tickerData = mockData;
    
    renderMarketTable();
    renderTickerTape();
    startTickerScroll();
}

// Render market table
function renderMarketTable() {
    marketTableBody.innerHTML = '';
    
    marketData.forEach(coin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="pair-info">
                    <img src="${coin.image}" alt="${coin.symbol}" class="pair-icon" width="24" height="24">
                    <div>
                        <div class="pair-name">${coin.symbol.toUpperCase()}/USDT</div>
                        <div class="pair-symbol">${coin.name}</div>
                    </div>
                </div>
            </td>
            <td class="price-cell">$${coin.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
            <td class="change-cell ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                ${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
            </td>
            <td class="volume-cell">$${(coin.total_volume / 1000000).toFixed(2)}M</td>
            <td class="marketcap-cell">$${(coin.market_cap / 1000000000).toFixed(1)}B</td>
            <td class="action-cell">
                <button class="btn btn-outline btn-sm trade-btn" data-pair="${coin.symbol.toUpperCase()}/USDT">
                    Trade
                </button>
            </td>
        `;
        marketTableBody.appendChild(row);
        
        // Add click handler for the entire row
        row.addEventListener('click', function(e) {
            // Only trigger if the click wasn't on the trade button
            if (!e.target.closest('.trade-btn')) {
                const pair = this.querySelector('.trade-btn').dataset.pair;
                selectPair(pair);
            }
        });
        
        // Add click handler for the trade button
        const tradeBtn = row.querySelector('.trade-btn');
        tradeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const pair = this.dataset.pair;
            selectPair(pair);
        });
    });
    
    // If no data, show a message
    if (marketData.length === 0) {
        marketTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    No market data available. Please try again later.
                </td>
            </tr>
        `;
    }
}

// Market filters
function initMarketFilters() {
    const filtersBtn = document.getElementById('marketFiltersBtn');
    filtersBtn.addEventListener('click', toggleMarketFilter);
}

function toggleMarketFilter() {
    const filtersBtn = document.getElementById('marketFiltersBtn');

    if (currentMarketFilter === 'normal') {
        currentMarketFilter = 'gainers';
        applyMarketFilter('gainers');
        updateFilterButton('Gainers', 'gainers');
    } else if (currentMarketFilter === 'gainers') {
        currentMarketFilter = 'losers';
        applyMarketFilter('losers');
        updateFilterButton('Losers', 'losers');
    } else if (currentMarketFilter === 'losers') {
        currentMarketFilter = 'normal';
        applyMarketFilter('normal');
        updateFilterButton('Market', 'normal');
    }
}

function applyMarketFilter(filterType) {
    if (!marketData.length) return;

    let filteredData = [...marketData];

    if (filterType === 'gainers') {
        filteredData.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    } else if (filterType === 'losers') {
        filteredData.sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
    }

    // update the global view
    marketData = filteredData;
    renderMarketTable();
}

function updateFilterButton(text, type) {
    const filtersBtn = document.getElementById('marketFiltersBtn');
    let icon = '<i class="fas fa-chart-simple"></i>';

    // reset classes
    filtersBtn.classList.remove('gainers', 'losers', 'active');

    if (type === 'gainers') {
        icon = '<i class="fas fa-chart-line"></i>';
        filtersBtn.classList.add('gainers');
    } else if (type === 'losers') {
        icon = '<i class="fas fa-arrow-down"></i>';
        filtersBtn.classList.add('losers');
    } else {
        filtersBtn.classList.add('active');
    }

    filtersBtn.innerHTML = `${icon} ${text}`;
}

// Render ticker tape
function renderTickerTape() {
    tickerTape.innerHTML = '';
    
    tickerData.forEach(coin => {
        const tickerItem = document.createElement('div');
        tickerItem.className = `ticker-item ${coin.symbol.toUpperCase() === currentPair.split('/')[0] ? 'active' : ''}`;
        tickerItem.dataset.pair = `${coin.symbol.toUpperCase()}/USDT`;
        
        tickerItem.innerHTML = `
            <span class="ticker-pair">
                ${coin.symbol.toUpperCase()}/USDT
                ${coin.favorite ? '<i class="fas fa-star"></i>' : ''}
            </span>
            <span class="ticker-price">$${coin.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
            <span class="ticker-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                ${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
            </span>
        `;
        
        tickerItem.addEventListener('click', function() {
            const pair = this.dataset.pair;
            selectPair(pair);
        });
        
        tickerTape.appendChild(tickerItem);
    });
    
    // Start scrolling after rendering
    startTickerScroll();
}

// Select trading pair
function selectPair(pair) {
    currentPair = pair;
    const [baseCurrency, quoteCurrency] = pair.split('/');
    
    // Navigate to trade section
    navigateTo('trade');
    
    // UI elements
    chartPairElement.textContent = pair;
    orderBookPairElement.textContent = pair;
    
    // Order book header
    document.querySelector('.order-book-header span:last-child').textContent = `Amount (${baseCurrency})`;
    
    // Update chart logo with the selected currency image
    updateChartLogo(baseCurrency);

    // Active ticker item
    document.querySelectorAll('.ticker-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.pair === pair) {
            item.classList.add('active');
        }
    });
    
    // Active row in market table
    document.querySelectorAll('#marketTableBody tr').forEach(row => {
        const rowPair = row.querySelector('.trade-btn')?.dataset.pair;
        if (rowPair === pair) {
            row.classList.add('highlight');
        } else {
            row.classList.remove('highlight');
        }
    });
    
    // Update order form
    orderActionElement.textContent = `Buy ${baseCurrency}`;
    orderAmountCurrencyElement.textContent = baseCurrency;
    
    // Update buy/sell buttons
    buyBtn.textContent = `Buy ${baseCurrency}`;
    sellBtn.textContent = `Sell ${baseCurrency}`;
    
    // Available balance
    if (user && portfolio['USDT']) {
        availableBalanceElement.textContent = `Available: ${portfolio['USDT'].amount.toFixed(2)} USDT`;
    } else {
        availableBalanceElement.textContent = `Available: --.-- USDT`;
    }
    
    updateTradingViewChart();
    
    // Reconnect WebSocket for new pair
    initWebSocket();
    
    fetchOrderBookData(pair);
    
    // Scroll to order panel
    document.querySelector('.order-panel').scrollIntoView({ behavior: 'smooth' });
}

// Function to update the chart logo
function updateChartLogo(currencySymbol) {
    const chartLogo = document.getElementById('chartLogo');
    const chartLogoImg = document.getElementById('chartLogoImg');
    
    // Find the coin data for the selected currency
    const coin = marketData.find(c => c.symbol.toUpperCase() === currencySymbol);
    
    if (coin && coin.image) {
        // Add spinning animation
        chartLogo.classList.add('spinning');
        
        // Create a new image to preload
        const newImg = new Image();
        newImg.onload = function() {
            // Update the image source
            chartLogoImg.src = coin.image;
            
            // Remove spinning animation after image loads
            setTimeout(() => {
                chartLogo.classList.remove('spinning');
            }, 1000);
        };
        newImg.onerror = function() {
            // If image fails to load, remove spinning and use fallback
            chartLogo.classList.remove('spinning');
            chartLogoImg.src = 'img/btc.png'; // Fallback image
        };
        newImg.src = coin.image;
    } else {
        // Use default logo if no image found
        chartLogoImg.src = 'img/btc.png';
    }
}


const timeframeDropdown = document.getElementById('timeframeDropdown');
if (timeframeDropdown) {
    timeframeDropdown.value = currentTimeframe;

    // Dropdown → Button sync
    timeframeDropdown.addEventListener('change', function() {
        const selectedTimeframe = this.value;
        currentTimeframe = selectedTimeframe;

        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.timeframe === selectedTimeframe) {
                btn.classList.add('active');
            }
        });

        updateTradingViewChart();
    });

    // Button → Dropdown sync
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            timeframeDropdown.value = this.dataset.timeframe;
        });
    });
}

// Connect the market section search button to the search functionality
document.querySelectorAll('#searchBtn').forEach(btn => {
    btn.addEventListener('click', showSearchModal);
});

// Add cleanup for the market data interval
window.addEventListener('beforeunload', function() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
    }
    
    if (socket) {
        socket.close();
    }
    
    if (tickerScrollInterval) {
        clearInterval(tickerScrollInterval);
    }
    
    if (marketDataUpdateInterval) {
        clearInterval(marketDataUpdateInterval);
    }
});

// Fetch order book data
async function fetchOrderBookData(pair) {
    const [base, quote] = pair.split('/');
    const symbol = `${base}${quote}`.toUpperCase();
    
    try {
        const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=10`);
        const data = await response.json();
        
        if (data.bids && data.asks) {
            const bids = data.bids.map(bid => [parseFloat(bid[0]), parseFloat(bid[1])])
                .sort((a, b) => b[0] - a[0]);
            const asks = data.asks.map(ask => [parseFloat(ask[0]), parseFloat(ask[1])])
                .sort((a, b) => a[0] - b[0]);
            
            const lastPrice = bids[0]?.[0] || asks[0]?.[0] || 0;
            const spread = bids[0]?.[0] && asks[0]?.[0] ? ((asks[0][0] - bids[0][0]) / bids[0][0]) * 100 : 0;
            
            updateOrderBook({
                bids: bids,
                asks: asks,
                lastPrice: lastPrice,
                spread: spread
            });
        }
    } catch (error) {
        console.error('Error fetching order book:', error);
    }
}

// Order book
function updateOrderBook(data) {
    orderBookData = data;
    
    lastPriceElement.textContent = data.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.querySelector('.spread .price').textContent = `Spread: ${data.spread.toFixed(2)}%`;
    
    orderBookAsks.innerHTML = '';
    data.asks.slice(0, 5).forEach(([price, amount]) => {
        const row = document.createElement('div');
        row.className = 'order-book-row ask';
        row.innerHTML = `
            <span class="price">${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span>${amount.toFixed(3)}</span>
        `;
        orderBookAsks.appendChild(row);
    });
    
    orderBookBids.innerHTML = '';
    data.bids.slice(0, 5).forEach(([price, amount]) => {
        const row = document.createElement('div');
        row.className = 'order-book-row bid';
        row.innerHTML = `
            <span class="price">${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span>${amount.toFixed(3)}</span>
        `;
        orderBookBids.appendChild(row);
    });
}

// Place order
async function placeOrder(side) {
    if (!user) {
        showModal('Login Required', 'Please login to place orders', {
            buttons: [
                { text: 'Cancel', action: 'close', class: 'btn-outline' },
                { text: 'Login', action: 'login', class: 'btn-primary' }
            ],
            onAction: (action) => {
                if (action === 'login') {
                    authModal.classList.add('active');
                }
            }
        });
        return;
    }

    const orderType = document.querySelector('.order-tab[data-type].active').dataset.type;
    const amount = parseFloat(document.getElementById('orderAmount').value) || 0;
    const price = orderType === 'market' ? null : parseFloat(document.getElementById('orderPrice').value) || 0;
    const total = parseFloat(document.getElementById('orderTotal').value) || 0;
    const [baseCurrency, quoteCurrency] = currentPair.split('/');
    
    if (orderType !== 'market' && (isNaN(price) || price <= 0)) {
        showModal('Invalid Price', 'Please enter a valid price');
        return;
    }
    
    if (isNaN(amount) || amount <= 0) {
        showModal('Invalid Amount', 'Please enter a valid amount');
        return;
    }
    
    try {
        const orderData = {
            pair: currentPair,
            type: orderType,
            side: side,
            amount: amount,
            price: price,
            total: total,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const orderRef = await db.collection('users').doc(user.uid).collection('orders').add(orderData);
        
        await db.collection('users').doc(user.uid).collection('notifications').add({
            type: 'order',
            message: `${side.toUpperCase()} order placed for ${amount} ${baseCurrency} at ${price ? price : 'market'} price`,
            read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        if (side === 'buy') {
            if (!portfolio[baseCurrency]) {
                portfolio[baseCurrency] = { amount: 0, avgPrice: 0 };
            }
            
            const totalCost = price * amount;
            const newAmount = portfolio[baseCurrency].amount + amount;
            const newAvgPrice = ((portfolio[baseCurrency].avgPrice * portfolio[baseCurrency].amount) + totalCost) / newAmount;
            
            portfolio[baseCurrency].amount = newAmount;
            portfolio[baseCurrency].avgPrice = newAvgPrice;
            
            if (!portfolio[quoteCurrency]) {
                portfolio[quoteCurrency] = { amount: 0 };
            }
            portfolio[quoteCurrency].amount -= totalCost;
        } else {
            if (!portfolio[baseCurrency] || portfolio[baseCurrency].amount < amount) {
                throw new Error('Insufficient balance');
            }
            
            portfolio[baseCurrency].amount -= amount;
            const totalValue = price * amount;
            
            if (!portfolio[quoteCurrency]) {
                portfolio[quoteCurrency] = { amount: 0 };
            }
            portfolio[quoteCurrency].amount += totalValue;
        }
        
        await db.collection('users').doc(user.uid).update({
            portfolio: portfolio
        });
        
        orderForm.reset();
        showModal('Order Placed', `${side.toUpperCase()} ${orderType.toUpperCase()} order placed successfully!`);
        loadUserData();
        
    } catch (error) {
        console.error('Error placing order:', error);
        showModal('Order Failed', `Failed to place order: ${error.message}`);
    }
}

// Portfolio table
function updatePortfolioTable() {
    if (!user) return;
    
    portfolioTableBody.innerHTML = '';
    
    let totalValue = 0;
    const portfolioEntries = [];
    
    for (const [symbol, data] of Object.entries(portfolio)) {
        if (data.amount <= 0) continue;
        
        const coin = marketData.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
        const currentPrice = coin ? coin.current_price : 0;
        const value = currentPrice * data.amount;
        totalValue += value;
        
        portfolioEntries.push({
            symbol,
            amount: data.amount,
            value,
            currentPrice,
            avgPrice: data.avgPrice || currentPrice,
            change: coin ? coin.price_change_percentage_24h : 0
        });
    }
    
    portfolioEntries.sort((a, b) => b.value - a.value);
    
    portfolioEntries.forEach(entry => {
        const allocation = (entry.value / totalValue) * 100;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="pair-info">
                    <div class="pair-icon">${entry.symbol.toUpperCase().charAt(0)}</div>
                    <div>
                        <div class="pair-name">${entry.symbol.toUpperCase()}</div>
                        <div class="pair-symbol">${entry.symbol.toUpperCase()}</div>
                    </div>
                </div>
            </td>
            <td>${entry.amount.toFixed(4)}</td>
            <td>$${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="${entry.change >= 0 ? 'positive' : 'negative'}">
                ${entry.change >= 0 ? '+' : ''}${entry.change.toFixed(2)}%
            </td>
            <td>
                ${allocation.toFixed(1)}%
                <div class="allocation-bar">
                    <div class="allocation-progress" style="width: ${allocation}%"></div>
                </div>
            </td>
            <td>
                <button class="btn btn-outline btn-sm" data-symbol="${entry.symbol}">
                    Trade
                </button>
            </td>
        `;
        portfolioTableBody.appendChild(row);
    });
    
    document.querySelectorAll('#portfolioTableBody .btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const symbol = this.dataset.symbol;
            selectPair(`${symbol}/USDT`);
            navigateTo('trade');
        });
    });
}

// Orders table
function updateOrdersTable() {
    if (!user) return;
    
    ordersTableBody.innerHTML = '';
    
    orders.forEach(order => {
        const [baseCurrency, quoteCurrency] = order.pair.split('/');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.pair}</td>
            <td class="${order.side === 'buy' ? 'positive' : 'negative'}">
                ${order.side.toUpperCase()}
            </td>
            <td>${order.price ? order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Market'}</td>
            <td>${order.type.charAt(0).toUpperCase() + order.type.slice(1)}</td>
            <td>${order.amount.toFixed(4)} ${baseCurrency}</td>
            <td>${order.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${quoteCurrency}</td>
            <td>${new Date(order.createdAt?.seconds * 1000).toLocaleString()}</td>
            <td>
                <span class="order-status status-${order.status}">
                    ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
            </td>
            <td>
                ${order.status === 'pending' ? `
                <button class="btn btn-outline btn-sm cancel-order" data-id="${order.id}">
                    Cancel
                </button>
                ` : ''}
            </td>
        `;
        ordersTableBody.appendChild(row);
    });
    
    document.querySelectorAll('.cancel-order').forEach(btn => {
        btn.addEventListener('click', async function() {
            const orderId = this.dataset.id;
            try {
                await db.collection('users').doc(user.uid).collection('orders').doc(orderId).update({
                    status: 'cancelled'
                });
                
                await db.collection('users').doc(user.uid).collection('notifications').add({
                    type: 'order',
                    message: `Order #${orderId} has been cancelled`,
                    read: false,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                loadUserData();
                
            } catch (error) {
                console.error('Error cancelling order:', error);
                showModal('Action Failed', 'Failed to cancel order');
            }
        });
    });
}

// Update notifications
function updateNotifications() {
    if (!user) return;
    
    const unreadCount = notifications.filter(n => !n.read).length;
    notificationBadge.textContent = unreadCount > 0 ? unreadCount : '';
    
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    notificationList.innerHTML = '';
    
    notifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? '' : 'unread'}`;
        item.innerHTML = `
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${new Date(notification.createdAt?.seconds * 1000).toLocaleTimeString()}</div>
        `;
        
        item.addEventListener('click', async () => {
            if (!notification.read) {
                await db.collection('users').doc(user.uid).collection('notifications').doc(notification.id).update({
                    read: true
                });
                loadUserData();
            }
        });
        
        notificationList.appendChild(item);
    });
}

// Toggle notifications panel
function toggleNotifications() {
    notificationPanel.classList.toggle('active');
}

// Modal utility function
function showModal(title, message, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const buttons = options.buttons || [
        { text: 'Understood', action: 'close', class: 'btn-primary' }
    ];
    
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-handle"></div>
            <button class="modal-close">&times;</button>
            <h3 class="modal-title">${title}</h3>
            <div class="modal-content">
                ${message}
            </div>
            <div class="modal-actions">
                ${buttons.map(btn => `
                    <button type="button" class="btn ${btn.class}" data-action="${btn.action}">
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add a slight delay before adding active class to allow for transition
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    const closeModal = () => {
        modal.classList.add('closing');
        modal.addEventListener('transitionend', () => {
            modal.remove();
        }, { once: true });
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // Handle button actions
    modal.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action === 'close') {
                closeModal();
            } else if (options.onAction) {
                options.onAction(action);
            }
        });
    });
    
    // Close when clicking on backdrop
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    return {
        close: closeModal
    };
}

// Deposit modal
function showDepositModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-handle"></div>
            <button class="modal-close">&times;</button>
            <h3 class="modal-title">Deposit Funds</h3>
            <form class="modal-form" id="depositForm">
                <div class="form-group">
                    <label>Currency</label>
                    <select id="depositCurrency">
                        <option value="USDT">USDT</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" id="depositAmount" min="0" step="0.0001" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline modal-close-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Deposit</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add a slight delay before adding active class to allow for transition
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    const closeModal = () => {
        modal.classList.add('closing');

        const container = modal.querySelector('.modal-container');
        container.addEventListener('transitionend', () => {
            modal.remove();
        }, { once: true });
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    
    // Close when clicking on backdrop
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    modal.querySelector('#depositForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currency = modal.querySelector('#depositCurrency').value;
        const amount = parseFloat(modal.querySelector('#depositAmount').value);
        
        try {
            if (!portfolio[currency]) {
                portfolio[currency] = { amount: 0 };
            }
            portfolio[currency].amount += amount;
            
            await db.collection('users').doc(user.uid).update({
                portfolio: portfolio
            });
            
            await db.collection('users').doc(user.uid).collection('notifications').add({
                type: 'deposit',
                message: `Deposited ${amount} ${currency} to your account`,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            closeModal();
            loadUserData();
            
        } catch (error) {
            console.error('Error depositing funds:', error);
            showModal('Deposit Failed', 'An error occurred while processing your deposit. Please try again later.', )
        }
    });
}

// Withdraw modal
function showWithdrawModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-handle"></div>
            <button class="modal-close">&times;</button>
            <h3 class="modal-title">Withdraw Funds</h3>
            <form class="modal-form" id="withdrawForm">
                <div class="form-group">
                    <label>Currency</label>
                    <select id="withdrawCurrency">
                        ${Object.entries(portfolio)
                            .filter(([_, data]) => data.amount > 0)
                            .map(([symbol]) => `<option value="${symbol}">${symbol.toUpperCase()}</option>`)
                            .join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" id="withdrawAmount" min="0" step="0.0001" required>
                </div>
                <div class="form-group">
                    <label>Wallet Address</label>
                    <input type="text" id="withdrawAddress" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline modal-close-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Withdraw</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    const closeModal = () => {
        modal.classList.add('closing');

        const container = modal.querySelector('.modal-container');
        container.addEventListener('transitionend', () => {
            modal.remove();
        }, { once: true });
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    modal.querySelector('#withdrawForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currency = modal.querySelector('#withdrawCurrency').value;
        const amount = parseFloat(modal.querySelector('#withdrawAmount').value);
        const address = modal.querySelector('#withdrawAddress').value;
        
        if (!portfolio[currency] || portfolio[currency].amount < amount) {
            showModal('Withdrawal Failed', 'You do not have enough balance to withdraw this amount.');
            return;
        }
        
        try {
            portfolio[currency].amount -= amount;
            
            await db.collection('users').doc(user.uid).update({
                portfolio: portfolio
            });
            
            await db.collection('users').doc(user.uid).collection('notifications').add({
                type: 'withdrawal',
                message: `Withdrew ${amount} ${currency} to ${address}`,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            closeModal();
            loadUserData();
            
        } catch (error) {
            console.error('Error withdrawing funds:', error);
            showModal('Withdrawal Failed', 'An error occurred while processing your withdrawal. Please try again later.');
        }
    });
}

// Exchange modal function
function showExchangeModal() {
    if (!user) {
        showModal('Login Required', 'Please login to exchange currencies', {
            buttons: [
                { text: 'Cancel', action: 'close', class: 'btn-negative' },
                { text: 'Login', action: 'login', class: 'btn-primary' }
            ],
            onAction: (action) => {
                if (action === 'login') {
                    authModal.classList.add('active');
                }
            }
        });
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-handle"></div>
            <button class="modal-close">&times;</button>
            <h3 class="modal-title">Exchange Currencies</h3>
            <form class="modal-form" id="exchangeForm">
                <div class="form-group">
                    <label>From</label>
                    <select id="exchangeFrom" required>
                        ${Object.entries(portfolio)
                            .filter(([_, data]) => data.amount > 0)
                            .map(([symbol]) => `<option value="${symbol}">${symbol.toUpperCase()}</option>`)
                            .join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>To</label>
                    <select id="exchangeTo" required>
                        ${Object.entries(portfolio)
                            .map(([symbol]) => `<option value="${symbol}" ${symbol === 'USDT' ? 'selected' : ''}>${symbol.toUpperCase()}</option>`)
                            .join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" id="exchangeAmount" min="0" step="0.0001" required>
                </div>
                
                <div class="form-group">
                    <label>Estimated Rate</label>
                    <div class="exchange-rate-info" id="exchangeRateInfo">
                        <span class="loading"></span> Calculating...
                    </div>
                </div>
                
                <div class="form-group">
                    <label>You Will Receive</label>
                    <div class="exchange-result" id="exchangeResult">
                        --.--
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="btn btn-negative modal-close-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Confirm Exchange</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    const closeModal = () => {
        modal.classList.add('closing');
        const container = modal.querySelector('.modal-container');
        container.addEventListener('transitionend', () => {
            modal.remove();
        }, { once: true });
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Get DOM elements
    const fromSelect = modal.querySelector('#exchangeFrom');
    const toSelect = modal.querySelector('#exchangeTo');
    const amountInput = modal.querySelector('#exchangeAmount');
    const rateInfo = modal.querySelector('#exchangeRateInfo');
    const resultDisplay = modal.querySelector('#exchangeResult');
    
    // Function to calculate exchange
    const calculateExchange = async () => {
        const fromCurrency = fromSelect.value;
        const toCurrency = toSelect.value;
        const amount = parseFloat(amountInput.value) || 0;
        
        if (amount <= 0) {
            resultDisplay.textContent = '--.--';
            return;
        }
        
        if (fromCurrency === toCurrency) {
            rateInfo.innerHTML = '<span class="negative">Cannot exchange same currency</span>';
            resultDisplay.textContent = '--.--';
            return;
        }
        
        try {
            // Get current prices (simplified - in a real app, use actual exchange rates)
            const fromCoin = marketData.find(c => c.symbol.toLowerCase() === fromCurrency.toLowerCase());
            const toCoin = marketData.find(c => c.symbol.toLowerCase() === toCurrency.toLowerCase());
            
            if (!fromCoin || !toCoin) {
                rateInfo.innerHTML = '<span class="negative">Rate unavailable</span>';
                resultDisplay.textContent = '--.--';
                return;
            }
            
            const fromPrice = fromCoin.current_price;
            const toPrice = toCoin.current_price;
            const rate = fromPrice / toPrice;
            const result = amount * rate;
            
            rateInfo.innerHTML = `1 ${fromCurrency.toUpperCase()} = ${rate.toFixed(6)} ${toCurrency.toUpperCase()}`;
            resultDisplay.textContent = `${result.toFixed(6)} ${toCurrency.toUpperCase()}`;
            
        } catch (error) {
            console.error('Error calculating exchange:', error);
            rateInfo.innerHTML = '<span class="negative">Error calculating rate</span>';
            resultDisplay.textContent = '--.--';
        }
    };
    
    // Event listeners for form elements
    fromSelect.addEventListener('change', calculateExchange);
    toSelect.addEventListener('change', calculateExchange);
    amountInput.addEventListener('input', calculateExchange);
    
    // Set max amount based on selected currency
    fromSelect.addEventListener('change', () => {
        const currency = fromSelect.value;
        const balance = portfolio[currency]?.amount || 0;
        amountInput.setAttribute('max', balance);
        amountInput.placeholder = `Max: ${balance.toFixed(6)}`;
        calculateExchange();
    });
    
    // Initialize with first currency
    if (fromSelect.options.length > 0) {
        fromSelect.dispatchEvent(new Event('change'));
    }
    
    // Form submission
    modal.querySelector('#exchangeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fromCurrency = fromSelect.value;
        const toCurrency = toSelect.value;
        const amount = parseFloat(amountInput.value);
        
        if (fromCurrency === toCurrency) {
            showModal('Exchange Error', 'Cannot exchange the same currency.');
            return;
        }
        
        if (!portfolio[fromCurrency] || portfolio[fromCurrency].amount < amount) {
            showModal('Exchange Error', 'Insufficient balance for this exchange.');
            return;
        }
        
        try {
            // Get current rates (in a real app, you would use actual exchange rates)
            const fromCoin = marketData.find(c => c.symbol.toLowerCase() === fromCurrency.toLowerCase());
            const toCoin = marketData.find(c => c.symbol.toLowerCase() === toCurrency.toLowerCase());
            
            if (!fromCoin || !toCoin) {
                showModal('Exchange Error', 'Unable to get current exchange rates.');
                return;
            }
            
            const fromPrice = fromCoin.current_price;
            const toPrice = toCoin.current_price;
            const rate = fromPrice / toPrice;
            const receivedAmount = amount * rate;
            
            // Update portfolio
            portfolio[fromCurrency].amount -= amount;
            
            if (!portfolio[toCurrency]) {
                portfolio[toCurrency] = { amount: 0, avgPrice: toPrice };
            } else {
                // Calculate new average price
                const currentValue = portfolio[toCurrency].amount * (portfolio[toCurrency].avgPrice || toPrice);
                const newValue = receivedAmount * toPrice;
                const totalAmount = portfolio[toCurrency].amount + receivedAmount;
                portfolio[toCurrency].avgPrice = (currentValue + newValue) / totalAmount / toPrice;
            }
            
            portfolio[toCurrency].amount += receivedAmount;
            
            // Update database
            await db.collection('users').doc(user.uid).update({
                portfolio: portfolio
            });
            
            // Add notification
            await db.collection('users').doc(user.uid).collection('notifications').add({
                type: 'exchange',
                message: `Exchanged ${amount} ${fromCurrency} for ${receivedAmount.toFixed(6)} ${toCurrency}`,
                read: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Add to transaction history
            await db.collection('users').doc(user.uid).collection('transactions').add({
                type: 'exchange',
                fromCurrency: fromCurrency,
                toCurrency: toCurrency,
                amount: amount,
                received: receivedAmount,
                rate: rate,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            closeModal();
            showModal('Exchange Successful', `Successfully exchanged ${amount} ${fromCurrency.toUpperCase()} for ${receivedAmount.toFixed(6)} ${toCurrency.toUpperCase()}`);
            loadUserData();
            
        } catch (error) {
            console.error('Error processing exchange:', error);
            showModal('Exchange Failed', 'An error occurred while processing your exchange. Please try again.');
        }
    });
    
    // Initial calculation
    calculateExchange();
}

// Show search modal
function showSearchModal() {
    const existingModal = document.querySelector('.search-modal');
    if (existingModal) {
        existingModal.classList.add('active');
        return;
    }    
    const modal = document.createElement('div');
    modal.className = 'search-modal';
    modal.innerHTML = `
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search for coins..." id="searchInput" autocomplete="off">
            <div class="search-results" id="searchResults"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const searchBtn = document.getElementById('searchBtn');
    const searchBtnRect = searchBtn.getBoundingClientRect();
    
    modal.style.right = `${window.innerWidth - searchBtnRect.left}px`;
    modal.style.top = `${searchBtnRect.bottom}px`;
    
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    const handleClickOutside = (e) => {
        if (!modal.contains(e.target)) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
                document.removeEventListener('click', handleClickOutside);
            }, 300);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 100);
    
    const searchInput = modal.querySelector('#searchInput');
    const searchResults = modal.querySelector('#searchResults');
    
    searchInput.focus();
    
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        if (query.length < 1) {
            searchResults.innerHTML = '';
            return;
        }
        
        const results = marketData.filter(coin => 
            coin.name.toLowerCase().includes(query) || 
            coin.symbol.toLowerCase().includes(query)
        ).slice(0, 10);
        
        searchResults.innerHTML = '';
        
        results.forEach(coin => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <img src="${coin.image}" alt="${coin.symbol}" width="32" height="32" style="border-radius: 50%;">
                <div class="search-result-info">
                    <div class="search-result-name">${coin.name}</div>
                    <div class="search-result-symbol">${coin.symbol.toUpperCase()}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                selectPair(`${coin.symbol.toUpperCase()}/USDT`);
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.remove();
                    document.removeEventListener('click', handleClickOutside);
                }, 300);
            });
            
            searchResults.appendChild(item);
        });
    });
}

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
    }
    
    if (socket) {
        socket.close();
    }
    
    if (tickerScrollInterval) {
        clearInterval(tickerScrollInterval);
    }
});