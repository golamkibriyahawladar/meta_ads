// ==========================================
// Meta Ads Dashboard Frontend Logic
// ==========================================

// Global state
let userProfile = null;
let userPages = [];

// DOM Elements
const fbLoginBtn = document.getElementById('fb-login-btn');
const fbLogoutBtn = document.getElementById('fb-logout-btn');
const authSection = document.getElementById('auth-section');
const userProfileDiv = document.getElementById('user-profile');
const userNameSpan = document.getElementById('user-name');
const userAvatarImg = document.getElementById('user-avatar');
const dashboardContent = document.getElementById('dashboard-content');
const pageLoader = document.getElementById('page-loader');
const refreshBtn = document.getElementById('refresh-btn');
const leadsBody = document.getElementById('leads-body');
const totalLeadsCount = document.getElementById('total-leads-count');
const connectedPagesCount = document.getElementById('connected-pages-count');

// ==========================================
// 1. Facebook SDK Initialization
// ==========================================
window.fbAsyncInit = function() {
    FB.init({
        // NOTE: Replace with your actual Facebook App ID
        appId      : 'YOUR_FACEBOOK_APP_ID', 
        cookie     : true,
        xfbml      : true,
        version    : 'v19.0'
    });
      
    // Check login status on page load
    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });
};

// ==========================================
// 2. Auth Status Callback
// ==========================================
function statusChangeCallback(response) {
    console.log('FB Auth Status:', response);
    
    if (response.status === 'connected') {
        // Logged in
        const accessToken = response.authResponse.accessToken;
        console.log('Access Token acquired');
        
        fetchUserProfile();
        fetchUserPages();
        fetchLeadsFromServer(); // Fetch leads from our Node.js backend
        
        showDashboard(true);
    } else {
        // Not logged in
        showDashboard(false);
    }
}

// ==========================================
// 3. Login / Logout Handlers
// ==========================================
fbLoginBtn.addEventListener('click', () => {
    // We request the specific permissions needed for Lead Ads
    FB.login(function(response) {
        statusChangeCallback(response);
    }, {
        scope: 'public_profile,email,pages_show_list,pages_manage_ads,pages_read_engagement,leads_retrieval'
    });
});

fbLogoutBtn.addEventListener('click', () => {
    FB.logout(function(response) {
        userProfile = null;
        userPages = [];
        showDashboard(false);
    });
});

refreshBtn.addEventListener('click', () => {
    fetchLeadsFromServer();
});

// ==========================================
// 4. Graph API Calls
// ==========================================

function fetchUserProfile() {
    FB.api('/me', {fields: 'name,picture'}, function(response) {
        console.log('User Profile:', response);
        userProfile = response;
        
        userNameSpan.textContent = response.name;
        if (response.picture && response.picture.data) {
            userAvatarImg.src = response.picture.data.url;
        }
    });
}

function fetchUserPages() {
    FB.api('/me/accounts', function(response) {
        console.log('User Pages:', response);
        if (response.data) {
            userPages = response.data;
            connectedPagesCount.textContent = userPages.length;
            
            // In a real app, here you would send the Page Access Tokens to the backend
            // so the backend can subscribe the webhooks using:
            // POST /{page-id}/subscribed_apps
        }
    });
}

// ==========================================
// 5. Backend Communication
// ==========================================

async function fetchLeadsFromServer() {
    showLoader(true);
    try {
        // Fetch leads from our Express backend
        const response = await fetch('/api/leads');
        const data = await response.json();
        
        console.log('Leads from backend:', data);
        
        if (data.success) {
            renderLeads(data.leads);
        }
    } catch (error) {
        console.error('Error fetching leads:', error);
    } finally {
        showLoader(false);
    }
}

// ==========================================
// 6. UI Rendering
// ==========================================

function renderLeads(leads) {
    totalLeadsCount.textContent = leads.length;
    leadsBody.innerHTML = '';
    
    if (leads.length === 0) {
        leadsBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">No leads found yet. Connect your page and wait for leads.</td>
            </tr>
        `;
        return;
    }
    
    leads.forEach(lead => {
        const date = new Date(lead.created_time).toLocaleString();
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${lead.id}</td>
            <td>${lead.page_id}</td>
            <td>${lead.form_id}</td>
            <td>${date}</td>
            <td><span class="status-badge">${lead.status}</span></td>
        `;
        leadsBody.appendChild(tr);
    });
}

function showDashboard(isLoggedIn) {
    if (isLoggedIn) {
        fbLoginBtn.classList.add('hidden');
        userProfileDiv.classList.remove('hidden');
        dashboardContent.classList.remove('hidden');
    } else {
        fbLoginBtn.classList.remove('hidden');
        userProfileDiv.classList.add('hidden');
        dashboardContent.classList.add('hidden');
    }
}

function showLoader(show) {
    if (show) {
        pageLoader.classList.remove('hidden');
    } else {
        pageLoader.classList.add('hidden');
    }
}
