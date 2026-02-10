document.addEventListener('DOMContentLoaded', () => {

    // --- ENVELOPE LOGIC (HOLD TO OPEN) ---
    const sealBtn = document.getElementById('sealBtn');
    const envelope = document.querySelector('.envelope');
    const envelopeWrapper = document.getElementById('envelopeWrapper');
    const mainWrapper = document.getElementById('mainWrapper');
    const heartsContainer = document.getElementById('heartsContainer');
    const progressCircle = document.querySelector('.progress-ring__circle');

    let holdTimer = null;
    let holdDuration = 1500; // 1.5 seconds to unlock
    let isHeld = false;
    let startTime = 0;

    if (sealBtn && progressCircle) {
        const circumference = progressCircle.r.baseVal.value * 2 * Math.PI;
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;

        function setProgress(percent) {
            const offset = circumference - percent / 100 * circumference;
            progressCircle.style.strokeDashoffset = offset;
        }

        function startHold(e) {
            e.preventDefault();
            if (isMsgOpen) return; // Already open

            isHeld = true;
            sealBtn.classList.add('pressing');
            startTime = Date.now();

            // Animation loop
            requestAnimationFrame(updateHold);
        }

        function endHold(e) {
            e.preventDefault();
            isHeld = false;
            sealBtn.classList.remove('pressing');
            setProgress(0); // Reset
        }

        let isMsgOpen = false;

        function updateHold() {
            if (!isHeld || isMsgOpen) return;

            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / holdDuration) * 100, 100);

            setProgress(progress);

            if (elapsed >= holdDuration) {
                // UNLOCKED!
                isMsgOpen = true;
                unlockEnvelope();
            } else {
                requestAnimationFrame(updateHold);
            }
        }

        function unlockEnvelope() {
            isHeld = false;
            sealBtn.classList.remove('pressing');
            sealBtn.innerHTML = "🔓";
            sealBtn.style.transform = "translate(-50%, -50%) scale(1.2)";
            sealBtn.style.background = "#4cc9f0";

            setTimeout(() => {
                envelope.classList.add('open');

                for (let i = 0; i < 20; i++) setTimeout(createHeart, i * 50);

                setTimeout(() => {
                    envelopeWrapper.classList.add('fade-out');
                    setTimeout(() => {
                        envelopeWrapper.style.display = 'none';
                        mainWrapper.classList.remove('hidden');
                        mainWrapper.classList.add('visible');
                    }, 800);
                }, 1000);
            }, 300);
        }

        sealBtn.addEventListener('mousedown', startHold);
        sealBtn.addEventListener('mouseup', endHold);
        sealBtn.addEventListener('mouseleave', endHold);
        sealBtn.addEventListener('touchstart', startHold);
        sealBtn.addEventListener('touchend', endHold);
    }


    // --- HEART ANIMATION ---
    function createHeart() {
        if (!heartsContainer) return;

        const heart = document.createElement('div');
        heart.classList.add('floating-heart');
        heart.innerHTML = '❤';

        const randomLeft = Math.random() * 100;
        const randomSize = Math.random() * 20 + 15;
        const randomDuration = Math.random() * 5000 + 3000;
        const randomDelay = Math.random() * 2000;

        heart.style.left = randomLeft + '%';
        heart.style.fontSize = randomSize + 'px';
        heart.style.animationDuration = randomDuration + 'ms';
        heart.style.animationDelay = randomDelay + 'ms';

        const colors = ['#ff4d6d', '#ff758f', '#ff8fa3', '#ffb3c1', '#fff0f3'];
        heart.style.color = colors[Math.floor(Math.random() * colors.length)];
        heart.style.opacity = Math.random() * 0.5 + 0.3;

        heartsContainer.appendChild(heart);

        setTimeout(() => {
            heart.remove();
        }, randomDuration + randomDelay);
    }

    if (heartsContainer) {
        setInterval(createHeart, 1500);
        for (let i = 0; i < 10; i++) setTimeout(createHeart, i * 300);
    }


    // --- CONFESSION / REPLY LOGIC ---
    const form = document.getElementById('confessionForm');
    const confessionsList = document.getElementById('confessionsList');
    const btnYes = document.getElementById('btnYes');
    const btnNo = document.getElementById('btnNo');
    const celebration = document.getElementById('celebration');
    const composeCard = document.querySelector('.compose-card');

    // 1. "NO" Button RUNAWAY Logic
    // 1. "NO" Button RUNAWAY Logic
    if (btnNo) {
        // Shared move logic
        const teleportButton = () => {
            const btn = btnNo;
            if (!btn.classList.contains('runaway')) {
                btn.classList.add('runaway');
            }

            // Random position within view
            const x = Math.random() * (window.innerWidth - btn.offsetWidth - 40) + 20;
            const y = Math.random() * (window.innerHeight - btn.offsetHeight - 40) + 20;

            btn.style.position = 'fixed';
            btn.style.left = `${x}px`;
            btn.style.top = `${y}px`;
        };

        // Standard triggers
        btnNo.addEventListener('mouseover', teleportButton);
        btnNo.addEventListener('click', (e) => { e.preventDefault(); teleportButton(); });
        btnNo.addEventListener('touchstart', (e) => { e.preventDefault(); teleportButton(); });

        // Force Field (The "Move Around" logic)
        document.addEventListener('mousemove', (e) => {
            const rect = btnNo.getBoundingClientRect();
            // Calculate center of button
            const btnX = rect.left + rect.width / 2;
            const btnY = rect.top + rect.height / 2;

            // Distance from cursor to button center
            const dist = Math.sqrt(Math.pow(e.clientX - btnX, 2) + Math.pow(e.clientY - btnY, 2));

            // If cursor is within 150px, run away!
            if (dist < 150) {
                teleportButton();
            }
        });
    }

    // 2. "YES" Button Logic
    if (btnYes) {
        btnYes.addEventListener('click', () => {
            // Explosion!
            for (let i = 0; i < 50; i++) setTimeout(createHeart, i * 30);

            // Show Overlay
            celebration.classList.add('visible');

            // Show Reply Form (Optional, if they want to say something)
            setTimeout(() => {
                celebration.classList.remove('visible'); // Hide celebration after 3s

                // Reveal the form to send a reply
                if (composeCard) {
                    composeCard.classList.remove('hidden-form');
                    composeCard.classList.add('visible-form');

                    // Scroll to it
                    composeCard.scrollIntoView({ behavior: 'smooth' });
                }

                // Auto-fill a message?
                const textarea = document.getElementById('confessionText');
                if (textarea) textarea.value = "Yes, I accept! ❤️";

            }, 3000);
        });
    }

    // 3. Regular API Fetch
    if (form && confessionsList) {
        async function loadConfessions() {
            try {
                const response = await fetch('/api/confessions');
                if (!response.ok) throw new Error('Failed to fetch');
                const confessions = await response.json();
                renderConfessions(confessions);
            } catch (error) {
                console.error("Fetch error:", error);
                confessionsList.innerHTML = `
                    <div style="text-align:center; padding: 2rem; color: #ff6b6b;">
                        <p>Failed to load messages.</p>
                        <button onclick="location.reload()" style="margin-top:1rem; padding:0.5rem 1rem; border:none; background:#ff4d6d; color:white; border-radius:5px; cursor:pointer;">Retry</button>
                    </div>`;
            }
        }

        function renderConfessions(confessions) {
            confessionsList.innerHTML = '';
            if (confessions.length === 0) {
                confessionsList.innerHTML = `
                    <div style="text-align:center; padding: 2rem; color: #aaa;">
                        <p>No messages yet.</p>
                    </div>`;
                return;
            }

            confessions.forEach((confession, index) => {
                const card = document.createElement('div');
                card.className = 'confession-card';
                card.style.animationDelay = `${index * 0.1}s`;

                const text = document.createElement('div');
                text.className = 'confession-text';
                text.textContent = confession.text;

                const meta = document.createElement('div');
                meta.className = 'confession-meta';

                const author = document.createElement('span');
                author.className = 'author';
                author.textContent = `- ${confession.author || 'Anonymous'}`;

                const time = document.createElement('span');
                time.className = 'timestamp';
                time.textContent = timeAgo(new Date(confession.timestamp));

                meta.appendChild(author);
                meta.appendChild(time);

                card.appendChild(text);
                card.appendChild(meta);

                confessionsList.appendChild(card);
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const textInput = document.getElementById('confessionText');
            const authorInput = document.getElementById('authorName');
            const submitButton = form.querySelector('button');
            const btnSpan = submitButton.querySelector('span');

            const text = textInput.value.trim();
            const author = authorInput.value.trim() || 'Anonymous';

            if (!text) return;

            submitButton.disabled = true;
            btnSpan.textContent = 'Sending...';

            try {
                await fetch('/api/confessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, author })
                });

                textInput.value = '';
                authorInput.value = '';

                for (let i = 0; i < 20; i++) setTimeout(createHeart, i * 50);

                loadConfessions();
            } catch (error) {
                alert('Could not send message.');
            } finally {
                submitButton.disabled = false;
                btnSpan.textContent = 'Send Love';
            }
        });

        loadConfessions();
    }

    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + "y ago";
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return interval + "mo ago";
        interval = Math.floor(seconds / 86400);
        if (interval > 1) return interval + "d ago";
        interval = Math.floor(seconds / 3600);
        if (interval > 1) return interval + "h ago";
        interval = Math.floor(seconds / 60);
        if (interval > 1) return interval + "m ago";
        return "Just now";
    }
});
