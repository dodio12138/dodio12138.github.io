const INSTAGRAM_PROFILE = {
    username: 'dodio_12138',
    displayName: 'Levy',
    avatar: 'res/img/instagram/avatar.jpg',
    url: 'https://www.instagram.com/dodio_12138/',
    stats: {
        posts: '11',
        followers: '23',
        following: '282'
    },
    bio: [
        '🖥️Indie Developer | 💡Creative Worker',
        '🎮Game 🎥Graphic 🗺️Map 🤖Robot 🔧Cybernetic'
    ]
};

const INSTAGRAM_POSTS = [
    {
        image: 'res/img/instagram/post-01.jpg',
        url: 'https://www.instagram.com/dodio_12138/reel/DUM2qwrDHGh/',
        alt: '哭死我了'
    },
    {
        image: 'res/img/instagram/post-02.jpg',
        url: 'https://www.instagram.com/dodio_12138/p/CNB-EHIhHS2/',
        alt: 'photo by'
    },
    {
        image: 'res/img/instagram/post-03.jpg',
        url: 'https://www.instagram.com/dodio_12138/p/CM_aWZFhvWP/',
        alt: 'The Falling Stars'
    },
    {
        image: 'res/img/instagram/post-04.jpg',
        url: 'https://www.instagram.com/dodio_12138/p/CI8QtEhHjLc/',
        alt: '公交车撞倒了电线杆'
    },
    {
        image: 'res/img/instagram/post-05.jpg',
        url: 'https://www.instagram.com/dodio_12138/p/CHXkKF2nUsS/',
        alt: 'photograph'
    },
    {
        image: 'res/img/instagram/post-06.jpg',
        url: 'https://www.instagram.com/dodio_12138/p/CFI1rbCHSz8/',
        alt: 'F1'
    },
    {
        image: 'res/img/instagram/post-07.jpg',
        url: 'https://www.instagram.com/dodio_12138/p/B-7PrFGndMf/',
        alt: 'elhoyo by dodio'
    },
    {
        image: 'res/img/instagram/post-08.jpg',
        url: 'https://www.instagram.com/dodio_12138/p/Btm--rCFaJv/',
        alt: '烧香'
    },
    {
        image: 'res/img/instagram/post-09.jpg',
        url: 'https://www.instagram.com/dodio_12138/p/BsMfcOwltZe/',
        alt: 'Instagram post'
    }
];

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function instagramwin() {
    var instagramHeight = Math.max(520, Math.min(650, window.innerHeight - 52));

    document.getElementById('windows').appendChild(createWindow('instagramwin', 430, instagramHeight, 'Instagram.exe', '../../res/img/Ins_logo_pixel.png'));
    const instagramwin = document.getElementById('instagramwin');
    const content = instagramwin.getElementsByClassName('wincontent')[0];

    instagramwin.style.top = '8px';
    content.classList.add('instagram-wincontent');
    content.innerHTML = `
        <div class="instagram-shell">
            <nav class="instagram-menu" aria-label="Instagram menu">
                <span>File</span>
                <span>Edit</span>
                <span>View</span>
                <span>Options</span>
                <span>Help</span>
            </nav>

            <header class="instagram-profile">
                <h2>${escapeHtml(INSTAGRAM_PROFILE.username)}</h2>
                <div class="instagram-divider"></div>
                <div class="instagram-profile-row">
                    <div class="instagram-avatar">
                        <img src="${INSTAGRAM_PROFILE.avatar}" alt="${escapeHtml(INSTAGRAM_PROFILE.username)} avatar">
                    </div>
                    <div class="instagram-profile-main">
                        <div class="instagram-stats">
                            <div><strong>${escapeHtml(INSTAGRAM_PROFILE.stats.posts)}</strong><span>posts</span></div>
                            <div><strong>${escapeHtml(INSTAGRAM_PROFILE.stats.followers)}</strong><span>followers</span></div>
                            <div><strong>${escapeHtml(INSTAGRAM_PROFILE.stats.following)}</strong><span>following</span></div>
                        </div>
                        <a class="instagram-follow" href="${INSTAGRAM_PROFILE.url}" target="_blank" rel="noopener noreferrer">+ Follow</a>
                    </div>
                </div>
                <div class="instagram-bio">
                    <strong>${escapeHtml(INSTAGRAM_PROFILE.displayName)}</strong>
                    ${INSTAGRAM_PROFILE.bio.map(line => `<span>${escapeHtml(line)}</span>`).join('')}
                    <a href="${INSTAGRAM_PROFILE.url}" target="_blank" rel="noopener noreferrer">instagram.com/${escapeHtml(INSTAGRAM_PROFILE.username)}</a>
                </div>
            </header>

            <div class="instagram-tabs" aria-label="Instagram sections">
                <button class="active" title="Grid">▦</button>
                <button title="List">☷</button>
                <button title="Tagged">◎</button>
                <button title="Archive">⌂</button>
            </div>

            <section class="instagram-grid" aria-label="Instagram posts">
                ${INSTAGRAM_POSTS.map(post => `
                    <a class="post photo-post" href="${post.url}" target="_blank" rel="noopener noreferrer">
                        <img src="${post.image}" alt="${escapeHtml(post.alt)}" loading="lazy">
                    </a>
                `).join('')}
            </section>

            <footer class="instagram-bottom-nav" aria-label="Instagram bottom navigation">
                <button title="Home">⌂</button>
                <button title="Search">⌕</button>
                <button title="Camera">▣</button>
                <button title="Likes">♡</button>
                <button class="active" title="Profile">♟</button>
            </footer>
        </div>
    `;
}
