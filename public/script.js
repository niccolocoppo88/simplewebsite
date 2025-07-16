document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('subscriptionForm');
    const emailInput = document.getElementById('email');
    const messageDiv = document.getElementById('message');
    const formContainer = document.querySelector('.form-container');
    let messageTimeout;

    const showMessage = (type, text) => {
        // Clear any existing timeout
        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }

        messageDiv.className = `${type} show`;
        messageDiv.textContent = type === 'success' ? '🎉 ' + text : '❌ ' + text;

        if (type === 'success') {
            formContainer.classList.add('form-success');
            emailInput.value = '';
        }

        // Set new timeout
        messageTimeout = setTimeout(() => {
            messageDiv.className = '';
            if (type === 'success') {
                formContainer.classList.remove('form-success');
            }
        }, 3000);
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();

        if (!email) {
            showMessage('error', 'Please enter an email address.');
            return;
        }

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            showMessage(data.success ? 'success' : 'error', data.message);
        } catch (error) {
            console.error('Subscription error:', error);
            showMessage('error', 'An error occurred. Please try again.');
        }
    });
});
