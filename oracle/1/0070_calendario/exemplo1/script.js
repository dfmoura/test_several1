document.addEventListener('DOMContentLoaded', function() {
    const calendarLink = document.getElementById('calendar-link');
    const registerLink = document.getElementById('register-link');
    const calendarDiv = document.getElementById('calendar');
    const registerDiv = document.getElementById('register');

    // Inicializa o calendário
    const calendar = new FullCalendar.Calendar(calendarDiv, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
    });

    // Alternar entre a visualização do calendário e a tabela de registro
    calendarLink.addEventListener('click', function() {
        calendarDiv.classList.remove('hidden');
        registerDiv.classList.add('hidden');
        calendar.render();
    });

    registerLink.addEventListener('click', function() {
        calendarDiv.classList.add('hidden');
        registerDiv.classList.remove('hidden');
    });
});
