document.getElementById('subscriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const messageDiv = document.getElementById('message');
    const formContainer = document.querySelector('.form-container');
    const email = emailInput.value;

    // Reset message state
    messageDiv.className = '';
    messageDiv.textContent = '';

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
            // Show success message with animation
            messageDiv.textContent = '🎉 ' + data.message;
            messageDiv.className = 'success show';
            formContainer.classList.add('form-success');
            emailInput.value = '';
            
            // Reset form after 3 seconds
            setTimeout(() => {
                messageDiv.className = '';
                formContainer.classList.remove('form-success');
            }, 3000);
        } else {
            messageDiv.className = 'error show';
            messageDiv.textContent = '❌ ' + data.message;
            
            // Hide error message after 3 seconds
            setTimeout(() => {
                messageDiv.className = '';
            }, 3000);
        }
    } catch (error) {
        messageDiv.className = 'error show';
        messageDiv.textContent = '❌ An error occurred. Please try again.';
        
        // Hide error message after 3 seconds
        setTimeout(() => {
            messageDiv.className = '';
        }, 3000);
    }
});
