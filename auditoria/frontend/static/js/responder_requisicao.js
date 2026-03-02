document.addEventListener('DOMContentLoaded', function () {
    const listaContainer = document.getElementById('lista-container');
    const formContainer = document.getElementById('form-container');
    const successAlert = document.getElementById('success-alert');
    const listaRequisicoes = document.getElementById('lista-requisicoes');
    const formResposta = document.getElementById('form-resposta');
    const voltarButton = document.getElementById('voltar-lista');

    const requisicoes = {
        'REQ-001': {
            assunto: 'Relatório de Governança e Gestão das Aquisições.',
            prazo: 'Prazo: 12 de Outubro de 2025'
        },
        'REQ-002': {
            assunto: 'Relatório de execução do contrato com a empresa \'Soluções TI\'.',
            prazo: 'Prazo: 12 de Setembro de 2025'
        },
        'REQ-003': {
            assunto: 'Notas fiscais referentes à aquisição de equipamentos de informática.',
            prazo: 'Prazo: 30 de Setembro de 2025'
        }
    };

    const mostrarFormulario = (id) => {
        const data = requisicoes[id];
        if (data) {
            document.getElementById('item-id').textContent = `Item: ${id}`;
            const assuntoElement = document.getElementById('item-assunto');
            assuntoElement.textContent = data.assunto;

            const questionsElement = document.querySelector(`[data-questions-for="${id}"]`);
            if (questionsElement) {
                assuntoElement.innerHTML += questionsElement.innerHTML;
            }

            document.getElementById('item-prazo').innerHTML = `<i class="uil uil-calendar-alt"></i> <span>${data.prazo}</span>`;
            
            listaContainer.classList.add('hidden');
            formContainer.classList.remove('hidden');
        }
    };

    const mostrarLista = () => {
        formContainer.classList.add('hidden');
        listaContainer.classList.remove('hidden');
        formResposta.reset();
        document.getElementById('file-list').innerHTML = '';
    };

    listaRequisicoes.addEventListener('click', function (e) {
        const item = e.target.closest('li');
        if (item) {
            const id = item.dataset.id;
            mostrarFormulario(id);
        }
    });

    voltarButton.addEventListener('click', mostrarLista);

    formResposta.addEventListener('submit', function (e) {
        e.preventDefault();
        
        successAlert.classList.remove('hidden');
        
        mostrarLista();

        setTimeout(() => {
            successAlert.classList.add('hidden');
        }, 4000);
    });

    // --- Lógica de Upload de Arquivos Aprimorada ---
    const dropzoneInput = document.getElementById('dropzone-file');
    const fileListContainer = document.getElementById('file-list');
    let uploadedFiles = [];

    const handleFiles = (files) => {
        for (const file of files) {
            if (!uploadedFiles.some(f => f.name === file.name)) {
                uploadedFiles.push(file);
            }
        }
        renderFileList();
    };

    const renderFileList = () => {
        fileListContainer.innerHTML = '';
        if (uploadedFiles.length > 0) {
            const list = document.createElement('ul');
            list.className = 'space-y-3';
            uploadedFiles.forEach((file, index) => {
                const listItem = document.createElement('li');
                listItem.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-lg';
                
                const fileInfo = `
                        <div class="flex items-center gap-3">
                            <i class="uil uil-file-alt text-2xl text-primary-600"></i>
                            <div>
                                <p class="font-medium text-gray-800 dark:text-white">${file.name}</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400">${(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>`;

                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '<i class="uil uil-times text-xl text-red-500 hover:text-red-700"></i>';
                removeBtn.className = 'p-1';
                removeBtn.onclick = () => {
                    uploadedFiles.splice(index, 1);
                    renderFileList();
                };

                listItem.innerHTML = fileInfo;
                listItem.appendChild(removeBtn);
                list.appendChild(listItem);
            });
            fileListContainer.appendChild(list);
        }
    };

    dropzoneInput.addEventListener('change', (e) => handleFiles(e.target.files));

    const dropzoneWrapper = document.getElementById('dropzone-wrapper');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzoneWrapper.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzoneWrapper.addEventListener(eventName, () => {
            dropzoneWrapper.querySelector('label').classList.add('border-primary-500', 'bg-primary-50');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzoneWrapper.addEventListener(eventName, () => {
            dropzoneWrapper.querySelector('label').classList.remove('border-primary-500', 'bg-primary-50');
        });
    });

    dropzoneWrapper.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    });
});