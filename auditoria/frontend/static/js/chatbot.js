let pendingFiles = [];
let attachedFilesDiv = null;

document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotMinimize = document.getElementById('chatbot-minimize');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotAttach = document.getElementById('chatbot-attach');
    const chatbotFile = document.getElementById('chatbot-file');
    chatbotFile.multiple = true;

    const createAttachedFilesDiv = () => {
        if (attachedFilesDiv) return;

        const inputArea = chatbotInput.parentElement.parentElement; // p-4
        attachedFilesDiv = document.createElement('div');
        attachedFilesDiv.id = 'attached-files';
        attachedFilesDiv.className = 'flex overflow-x-auto gap-2 mb-2 max-w-full p-1 bg-gray-100 dark:bg-gray-700 rounded scroll-smooth scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600';
        attachedFilesDiv.style.maxHeight = '40px';
        inputArea.insertBefore(attachedFilesDiv, chatbotInput.parentElement);
    };

    const addFileUI = (fileName) => {
        createAttachedFilesDiv();
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 min-w-0 flex-shrink-0';
        fileItem.innerHTML = `
            <i class="uil uil-file-alt text-gray-400 flex-shrink-0"></i>
            <span class="truncate flex-1" title="${fileName}">${fileName}</span>
            <button type="button" class="ml-1 text-customDanger hover:text-customDanger-hover p-0.5 rounded hover:bg-customDanger-light dark:hover:bg-customDanger-dark-hover flex-shrink-0">
                <i class="uil uil-trash-alt text-xs"></i>
            </button>
        `;
        fileItem.querySelector('button').onclick = (e) => {
            e.stopPropagation();
            const index = pendingFiles.findIndex(pf => pf.name === fileName);
            if (index > -1) {
                pendingFiles.splice(index, 1);
                fileItem.remove();
                updatePlaceholder();
                if (pendingFiles.length === 0) {
                    attachedFilesDiv.remove();
                    attachedFilesDiv = null;
                }
            }
        };
        attachedFilesDiv.appendChild(fileItem);
        updatePlaceholder();
    };

    const updatePlaceholder = () => {
        if (pendingFiles.length > 0) {
            chatbotInput.placeholder = 
`Anexados: ${pendingFiles.length} arquivo(s). Digite sua mensagem...
`;
        } else {
            chatbotInput.placeholder = 'Digite sua mensagem...';
        }
    };

    // Session management for file persistence
    let storedSessionId = localStorage.getItem('chatbotSessionId');
    if (storedSessionId === 'undefined' || !storedSessionId) {
        localStorage.removeItem('chatbotSessionId');
        window.chatbotSessionId = null;
    } else {
        window.chatbotSessionId = storedSessionId;
    }

    const loadChatHistory = async () => {
        // Remove static initial message from HTML if present
        const staticInitial = chatbotMessages.querySelector('.flex.items-start.gap-2\\.5.mb-4');
        if (staticInitial) {
            staticInitial.remove();
        }

        if (!window.chatbotSessionId) {
            addMessage('Olá! Como posso te ajudar hoje?', 'bot');
            return;
        }

        try {
            const response = await fetch(`/api/chatbot?session_id=${encodeURIComponent(window.chatbotSessionId)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }
            const data = await response.json();

            // Clear existing messages before loading to avoid duplicates on reload
            chatbotMessages.innerHTML = '';

            // Update session_id if necessary
            if (data.session_id && data.session_id !== 'undefined') {
                window.chatbotSessionId = data.session_id;
                localStorage.setItem('chatbotSessionId', data.session_id);
            }

            data.history.forEach(msgObj => {
                let filesObj = null;
                if (msgObj.file) {
                    filesObj = { name: msgObj.file.name };
                } else if (msgObj.files && msgObj.files.length > 0) {
                    filesObj = msgObj.files;
                }
                addMessage(msgObj.message, msgObj.sender, filesObj);
            });

            if (data.history.length === 0) {
                addMessage('Olá! Como posso te ajudar hoje?', 'bot');
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            // Fallback to initial message
            addMessage('Olá! Como posso te ajudar hoje?', 'bot');
        }
    };

    // Load history and set window state on initial load and page restore (back button)
    const initializeChatbot = () => {
        loadChatHistory();

        const isOpen = localStorage.getItem('chatbotOpen') === 'true';
        if (isOpen) {
            chatbotWindow.classList.remove('hidden');
            chatbotInput.focus();
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }
    };

    initializeChatbot();
    window.addEventListener('pageshow', initializeChatbot);

    const toggleChatbotWindow = () => {
        chatbotWindow.classList.toggle('hidden');
        const isOpen = !chatbotWindow.classList.contains('hidden');
        localStorage.setItem('chatbotOpen', isOpen.toString());

        if (isOpen) {
            chatbotToggle.style.display = 'none';
            // Ensure attached files div is created when opening
            createAttachedFilesDiv();
            chatbotInput.focus();
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        } else {
            chatbotToggle.style.display = 'flex';
        }
    };

    const minimizeChatbotWindow = () => {
        chatbotWindow.classList.add('hidden');
        chatbotToggle.style.display = 'flex';
    };

    const addMessage = (message, sender, files = null) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('flex', 'items-start', 'gap-2.5', 'mb-4');
    
        let contentHtml = `<p class="text-sm font-normal ${sender === 'user' ? 'text-white' : 'text-gray-900 dark:text-white'}">${message}</p>`;
    
        if (files && sender === 'user') {
            let fileHtml = '';
            if (Array.isArray(files)) {
                fileHtml = `
                    <div class="flex items-center gap-2 mb-1">
                        <i class="uil uil-file-alt text-xs ${sender === 'user' ? 'text-white/80' : 'text-gray-500'}"></i>
                        <span class="text-xs ${sender === 'user' ? 'text-white/80' : 'text-gray-500'} truncate max-w-48">${files.map(f => f.name).join(', ')}</span>
                    </div>
                `;
            } else if (files && files.name) {
                fileHtml = `
                    <div class="flex items-center gap-2 mb-1">
                        <i class="uil uil-file-alt text-xs ${sender === 'user' ? 'text-white/80' : 'text-gray-500'}"></i>
                        <span class="text-xs ${sender === 'user' ? 'text-white/80' : 'text-gray-500'} truncate max-w-48">${files.name}</span>
                    </div>
                `;
            }
            contentHtml = fileHtml + contentHtml;
        }
    
        if (sender === 'user') {
            messageElement.innerHTML = `
                <div class="flex flex-col w-full max-w-[320px] ml-auto leading-1.5 p-4 border-gray-200 bg-primary-600 rounded-s-xl rounded-ee-xl dark:bg-primary-600-hover">
                    ${contentHtml}
                </div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="flex flex-col w-full max-w-[320px] leading-1.5 p-4 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700">
                    <p class="text-sm font-normal text-gray-900 dark:text-white">${message}</p>
                </div>
            `;
        }
    
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    };
    
    const addLoadingMessage = () => {
        const messageElement = document.createElement('div');
        messageElement.id = 'loading-message';
        messageElement.classList.add('flex', 'items-start', 'gap-2.5', 'mb-4', 'animate-bounce');
    
        messageElement.innerHTML = `
            <div class="flex flex-col w-full max-w-[320px] leading-1.5 p-4 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700 animate-pulse">
                <p class="text-sm font-normal text-gray-900 dark:text-white flex items-center">
                    <span>IA está preparando uma resposta</span>
                    <span class="ml-1">
                        <span class="animate-pulse">.</span>
                        <span class="animate-pulse" style="animation-delay: 0.2s;">.</span>
                        <span class="animate-pulse" style="animation-delay: 0.4s;">.</span>
                    </span>
                </p>
            </div>
        `;
    
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    };

    const sendMessage = async () => {
        const message = chatbotInput.value.trim();
    
        if (!message && pendingFiles.length === 0) return;
    
        const filesForDisplay = pendingFiles.map(pf => ({name: pf.name}));
        const displayText = message || (pendingFiles.length > 0 ? 'Anexando arquivos...' : '');
        addMessage(displayText, 'user', filesForDisplay.length > 0 ? filesForDisplay : null);
        addLoadingMessage();
        chatbotInput.value = '';
    
        try {
            const formData = new FormData();
            if (message) formData.append('message', message);
            for (let pf of pendingFiles) {
                formData.append('files', pf.file);
            }
            if (window.chatbotSessionId) formData.append('session_id', window.chatbotSessionId);
    
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
    
            const loadingEl = document.getElementById('loading-message');
            if (loadingEl) loadingEl.remove();
    
            const data = await response.json();
            if (data.session_id && data.session_id !== 'undefined') {
                window.chatbotSessionId = data.session_id;
                localStorage.setItem('chatbotSessionId', data.session_id);
            }
            addMessage(data.reply, 'bot');
        } catch (error) {
            console.error('Error sending message:', error);
            const loadingEl = document.getElementById('loading-message');
            if (loadingEl) loadingEl.remove();
            addMessage('Desculpe, não consigo me conectar ao servidor no momento.', 'bot');
        }
    
        // Clear pending files after send attempt
        pendingFiles = [];
        if (attachedFilesDiv) {
            attachedFilesDiv.remove();
            attachedFilesDiv = null;
        }
        updatePlaceholder();
    };

    chatbotAttach.addEventListener('click', (e) => {
        e.preventDefault();
        chatbotFile.click();
    });
    
    chatbotFile.addEventListener('change', (e) => {
        for (let file of Array.from(e.target.files)) {
            if (!pendingFiles.find(pf => pf.name === file.name)) {
                pendingFiles.push({ file, name: file.name });
                addFileUI(file.name);
            }
        }
        // Clear input to allow more files
        e.target.value = '';
    });
    
    chatbotToggle.addEventListener('click', toggleChatbotWindow);
    chatbotMinimize.addEventListener('click', minimizeChatbotWindow);
    chatbotSend.addEventListener('click', sendMessage);
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
