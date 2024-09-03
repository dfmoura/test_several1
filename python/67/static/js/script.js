document.getElementById('chat-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const question = document.getElementById('question').value;
    const chatBox = document.getElementById('chat-box');
    
    const userDiv = document.createElement('div');
    userDiv.textContent = 'You: ' + question;
    chatBox.appendChild(userDiv);

    fetch('/ask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'question=' + encodeURIComponent(question),
    })
    .then(response => response.json())
    .then(data => {
        const spongebobDiv = document.createElement('div');
        spongebobDiv.textContent = 'SpongeBob: ' + data.answer;
        chatBox.appendChild(spongebobDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    });

    document.getElementById('question').value = '';
});
