// Application State
let currentUser = null;
let selectedRole = null;
let requests = JSON.parse(localStorage.getItem('requests')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];

// Initialize with sample data if empty
if (users.length === 0) {
    users = [
        { username: 'requester1', password: 'password', role: 'requester' },
        { username: 'developer1', password: 'password', role: 'developer' }
    ];
    localStorage.setItem('users', JSON.stringify(users));
}

// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const roleButtons = document.querySelectorAll('.role-btn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const newRequestBtn = document.getElementById('newRequestBtn');
const newRequestModal = document.getElementById('newRequestModal');
const newRequestForm = document.getElementById('newRequestForm');
const closeRequestModal = document.getElementById('closeRequestModal');
const cancelRequest = document.getElementById('cancelRequest');
const requestDetailsModal = document.getElementById('requestDetailsModal');
const closeDetailsModal = document.getElementById('closeDetailsModal');

// Dashboard sections
const requesterDashboard = document.getElementById('requesterDashboard');
const developerDashboard = document.getElementById('developerDashboard');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const availableRequests = document.getElementById('availableRequests');
const myTasks = document.getElementById('myTasks');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
newRequestBtn.addEventListener('click', openNewRequestModal);
closeRequestModal.addEventListener('click', closeModal);
cancelRequest.addEventListener('click', closeModal);
closeDetailsModal.addEventListener('click', closeModal);
newRequestForm.addEventListener('submit', handleNewRequest);

// Role selection
roleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        roleButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedRole = btn.dataset.role;
    });
});

// Tab switching
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
    });
});

// Modal close on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Initialize Application
function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    } else {
        showLogin();
    }
}

// Authentication Functions
function handleLogin(e) {
    e.preventDefault();
    
    if (!selectedRole) {
        alert('Please select a role first');
        return;
    }
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Simple authentication (in real app, this would be server-side)
    const user = users.find(u => 
        u.username === username && 
        u.password === password && 
        u.role === selectedRole
    );
    
    if (user) {
        currentUser = { username: user.username, role: user.role };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showDashboard();
    } else {
        alert('Invalid credentials or role mismatch');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLogin();
}

function showLogin() {
    loginPage.classList.add('active');
    dashboardPage.classList.remove('active');
    // Reset form
    loginForm.reset();
    roleButtons.forEach(btn => btn.classList.remove('selected'));
    selectedRole = null;
}

function showDashboard() {
    loginPage.classList.remove('active');
    dashboardPage.classList.add('active');
    
    // Update user info
    userInfo.textContent = `${currentUser.username} (${currentUser.role})`;
    
    // Show appropriate dashboard
    if (currentUser.role === 'requester') {
        requesterDashboard.classList.add('active');
        developerDashboard.classList.remove('active');
        loadRequesterDashboard();
    } else {
        developerDashboard.classList.add('active');
        requesterDashboard.classList.remove('active');
        loadDeveloperDashboard();
    }
}

// Requester Dashboard Functions
function loadRequesterDashboard() {
    const userRequests = requests.filter(req => req.requester === currentUser.username);
    
    // Update stats
    const pendingCount = userRequests.filter(req => req.status === 'pending').length;
    const inProgressCount = userRequests.filter(req => req.status === 'in-progress').length;
    const completedCount = userRequests.filter(req => req.status === 'completed').length;
    
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('inProgressCount').textContent = inProgressCount;
    document.getElementById('completedCount').textContent = completedCount;
    
    // Render requests
    renderRequesterRequests(userRequests);
}

function renderRequesterRequests(requests) {
    const container = document.getElementById('requesterRequests');
    container.innerHTML = '';
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="no-requests">No requests found. Create your first request!</p>';
        return;
    }
    
    requests.forEach(request => {
        const requestCard = createRequestCard(request, 'requester');
        container.appendChild(requestCard);
    });
}

// Developer Dashboard Functions
function loadDeveloperDashboard() {
    const availableRequestsList = requests.filter(req => req.status === 'pending');
    const myTasksList = requests.filter(req => 
        req.developer === currentUser.username && 
        ['in-progress', 'completed'].includes(req.status)
    );
    
    // Update stats
    document.getElementById('availableCount').textContent = availableRequestsList.length;
    document.getElementById('myTasksCount').textContent = myTasksList.filter(req => req.status === 'in-progress').length;
    document.getElementById('completedTasksCount').textContent = myTasksList.filter(req => req.status === 'completed').length;
    
    // Render lists
    renderAvailableRequests(availableRequestsList);
    renderMyTasks(myTasksList);
}

function renderAvailableRequests(requests) {
    const container = document.getElementById('availableRequestsList');
    container.innerHTML = '';
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="no-requests">No available requests at the moment.</p>';
        return;
    }
    
    requests.forEach(request => {
        const requestCard = createRequestCard(request, 'developer');
        container.appendChild(requestCard);
    });
}

function renderMyTasks(requests) {
    const container = document.getElementById('myTasksList');
    container.innerHTML = '';
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="no-requests">No tasks found.</p>';
        return;
    }
    
    requests.forEach(request => {
        const requestCard = createRequestCard(request, 'developer');
        container.appendChild(requestCard);
    });
}

// Request Card Creation
function createRequestCard(request, userType) {
    const card = document.createElement('div');
    card.className = `request-card ${request.status} ${request.urgencyLevel === 'urgent' ? 'urgent' : ''}`;
    
    const urgencyIcon = {
        'low': '🟢',
        'medium': '🟡',
        'high': '🟠',
        'urgent': '🔴'
    };
    
    card.innerHTML = `
        <div class="request-header">
            <div class="request-title">${request.title}</div>
            <div class="request-status status-${request.status}">${request.status}</div>
        </div>
        <div class="request-meta">
            <span>${urgencyIcon[request.urgencyLevel]} ${request.urgencyLevel}</span>
            <span>📅 ${new Date(request.deadline).toLocaleDateString()}</span>
            <span>👤 ${request.requester}</span>
            ${request.developer ? `<span>💻 ${request.developer}</span>` : ''}
        </div>
        <div class="request-description">${request.description}</div>
        <div class="request-actions">
            ${getRequestActions(request, userType)}
        </div>
    `;
    
    // Add click handler for details
    card.addEventListener('click', () => showRequestDetails(request, userType));
    
    return card;
}

function getRequestActions(request, userType) {
    if (userType === 'requester') {
        return `
            <button class="btn-secondary" onclick="event.stopPropagation(); showRequestDetails('${request.id}', 'requester')">
                View Details
            </button>
        `;
    } else {
        if (request.status === 'pending') {
            return `
                <button class="btn-primary" onclick="event.stopPropagation(); acceptRequest('${request.id}')">
                    Accept Request
                </button>
            `;
        } else if (request.status === 'in-progress') {
            return `
                <button class="btn-primary" onclick="event.stopPropagation(); updateRequestStatus('${request.id}', 'completed')">
                    Mark Complete
                </button>
            `;
        } else {
            return `
                <button class="btn-secondary" onclick="event.stopPropagation(); showRequestDetails('${request.id}', 'developer')">
                    View Details
                </button>
            `;
        }
    }
}

// Request Management Functions
function openNewRequestModal() {
    newRequestModal.classList.add('active');
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('deadline').min = today;
}

function closeModal() {
    newRequestModal.classList.remove('active');
    requestDetailsModal.classList.remove('active');
}

function handleNewRequest(e) {
    e.preventDefault();
    
    const title = document.getElementById('requestTitle').value;
    const description = document.getElementById('requestDescription').value;
    const urgencyLevel = document.getElementById('urgencyLevel').value;
    const deadline = document.getElementById('deadline').value;
    
    const newRequest = {
        id: generateId(),
        title,
        description,
        urgencyLevel,
        deadline,
        status: 'pending',
        requester: currentUser.username,
        developer: null,
        createdAt: new Date().toISOString()
    };
    
    requests.push(newRequest);
    localStorage.setItem('requests', JSON.stringify(requests));
    
    // Reset form and close modal
    newRequestForm.reset();
    closeModal();
    
    // Refresh dashboard
    loadRequesterDashboard();
    
    alert('Request created successfully!');
}

function acceptRequest(requestId) {
    const request = requests.find(req => req.id === requestId);
    if (request) {
        request.developer = currentUser.username;
        request.status = 'in-progress';
        request.acceptedAt = new Date().toISOString();
        
        localStorage.setItem('requests', JSON.stringify(requests));
        loadDeveloperDashboard();
        alert('Request accepted successfully!');
    }
}

function updateRequestStatus(requestId, newStatus) {
    const request = requests.find(req => req.id === requestId);
    if (request) {
        request.status = newStatus;
        if (newStatus === 'completed') {
            request.completedAt = new Date().toISOString();
        }
        
        localStorage.setItem('requests', JSON.stringify(requests));
        loadDeveloperDashboard();
        alert(`Request marked as ${newStatus}!`);
    }
}

function showRequestDetails(requestId, userType) {
    const request = typeof requestId === 'string' ? 
        requests.find(req => req.id === requestId) : requestId;
    
    if (!request) return;
    
    const modal = document.getElementById('requestDetailsModal');
    const title = document.getElementById('requestDetailsTitle');
    const content = document.getElementById('requestDetailsContent');
    const actions = document.getElementById('requestDetailsActions');
    
    title.textContent = request.title;
    
    const urgencyIcon = {
        'low': '🟢',
        'medium': '🟡',
        'high': '🟠',
        'urgent': '🔴'
    };
    
    content.innerHTML = `
        <div class="request-details">
            <div class="detail-row">
                <strong>Status:</strong> 
                <span class="request-status status-${request.status}">${request.status}</span>
            </div>
            <div class="detail-row">
                <strong>Urgency:</strong> 
                <span>${urgencyIcon[request.urgencyLevel]} ${request.urgencyLevel}</span>
            </div>
            <div class="detail-row">
                <strong>Deadline:</strong> 
                <span>${new Date(request.deadline).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
                <strong>Requester:</strong> 
                <span>${request.requester}</span>
            </div>
            ${request.developer ? `
                <div class="detail-row">
                    <strong>Developer:</strong> 
                    <span>${request.developer}</span>
                </div>
            ` : ''}
            <div class="detail-row">
                <strong>Created:</strong> 
                <span>${new Date(request.createdAt).toLocaleString()}</span>
            </div>
            ${request.acceptedAt ? `
                <div class="detail-row">
                    <strong>Accepted:</strong> 
                    <span>${new Date(request.acceptedAt).toLocaleString()}</span>
                </div>
            ` : ''}
            ${request.completedAt ? `
                <div class="detail-row">
                    <strong>Completed:</strong> 
                    <span>${new Date(request.completedAt).toLocaleString()}</span>
                </div>
            ` : ''}
            <div class="detail-row">
                <strong>Description:</strong>
                <p>${request.description}</p>
            </div>
        </div>
    `;
    
    // Set actions based on user type and request status
    actions.innerHTML = '';
    if (userType === 'developer' && request.status === 'pending') {
        actions.innerHTML = `
            <button class="btn-primary" onclick="acceptRequest('${request.id}'); closeModal();">
                Accept Request
            </button>
        `;
    } else if (userType === 'developer' && request.status === 'in-progress') {
        actions.innerHTML = `
            <button class="btn-primary" onclick="updateRequestStatus('${request.id}', 'completed'); closeModal();">
                Mark Complete
            </button>
        `;
    }
    
    modal.classList.add('active');
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update content sections
    availableRequests.classList.toggle('active', tabName === 'available');
    myTasks.classList.toggle('active', tabName === 'my-tasks');
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Add CSS for request details
const style = document.createElement('style');
style.textContent = `
    .request-details {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .detail-row {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f1f3f4;
    }
    
    .detail-row:last-child {
        border-bottom: none;
    }
    
    .detail-row strong {
        min-width: 100px;
        color: #333;
    }
    
    .detail-row p {
        margin: 0;
        color: #666;
        line-height: 1.5;
    }
    
    .no-requests {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 2rem;
    }
`;
document.head.appendChild(style); 