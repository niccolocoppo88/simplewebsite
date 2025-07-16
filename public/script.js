document.getElementById('subscriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const messageDiv = document.getElementById('message');
    const email = emailInput.value;

    try {
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        
        if (data.success) {
            messageDiv.className = 'success';
            messageDiv.textContent = data.message;
            emailInput.value = '';
        } else {
            messageDiv.className = 'error';
            messageDiv.textContent = data.message;
        }
    } catch (error) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'An error occurred. Please try again.';
    }
});
