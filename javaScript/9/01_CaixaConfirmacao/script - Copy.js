document.getElementById('confirmButton').addEventListener('click', function() {
    document.getElementById('confirmationBox').classList.remove('hidden');
});

document.getElementById('yesButton').addEventListener('click', function() {
    alert('Você confirmou!');
    document.getElementById('confirmationBox').classList.add('hidden');
});

document.getElementById('noButton').addEventListener('click', function() {
    alert('Você cancelou!');
    document.getElementById('confirmationBox').classList.add('hidden');
});
