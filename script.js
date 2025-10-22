// Espera a que todo el contenido del HTML esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERENCIAS A ELEMENTOS DEL DOM ---
    const nombreInput = document.getElementById('nombre-input');
    const grupoSelect = document.getElementById('grupo-select');
    const anadirBtn = document.getElementById('anadir-btn');
    const listsContainer = document.querySelector('.lists-container');
    const programaTables = [];
    for (let i = 1; i <= 8; i++) {
        const table = document.getElementById(`programa-table-${i}`);
        if (table) programaTables.push(table.querySelector('tbody'));
    }
    const autoAssignBtn = document.getElementById('auto-assign-btn');
    const clearProgramBtn = document.getElementById('clear-program-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const shareHtmlBtn = document.getElementById('share-html-btn');
    const appContainer = document.querySelector('.app-container');
    const loginBtn = document.getElementById('login-btn');
    const authStatusDiv = document.getElementById('auth-status');
    const userGreeting = document.getElementById('user-greeting');


    // Referencias para la navegación entre vistas
    const navPublicBtn = document.getElementById('nav-public-btn');
    const navGestorBtn = document.getElementById('nav-gestor-btn');
    const navProgramaBtn = document.getElementById('nav-programa-btn');
    const navCustomGroupsBtn = document.getElementById('nav-custom-groups-btn');
    const navTechBtn = document.getElementById('nav-tech-btn');
    const gestorView = document.getElementById('gestor-view');
    const publicView = document.getElementById('public-view');
    const programaView = document.getElementById('programa-view');
    const customGroupsView = document.getElementById('custom-groups-view');
    const techView = document.getElementById('tech-view');
    const cleaningConfigBtn = document.getElementById('cleaning-config-btn');

    // Elementos para la navegación por pestañas dentro de techView
    const techProgramsTabBtn = document.getElementById('tech-programs-tab-btn');
    const techTeamTabBtn = document.getElementById('tech-team-tab-btn');
    const techProgramsContent = document.getElementById('tech-programs-content');
    const techTeamContent = document.getElementById('tech-team-content');

    // Referencia para el menú contextual de mover
    const moveMenu = document.getElementById('move-menu');

    // Un objeto para acceder fácilmente a las listas
    const listas = {
        ancianos: document.getElementById('lista-ancianos'),
        hermanas: document.getElementById('lista-hermanas'),
        ministeriales: document.getElementById('lista-ministeriales'),
        publicadores: document.getElementById('lista-publicadores'),
    };

    // Estructura para lazos familiares
    let familyTies = [];

    // --- GESTIÓN DE SESIÓN ---
    // IMPORTANTE: Esta lista es visible en el código fuente. No es un método seguro.
    // Es solo para evitar ediciones accidentales.
    const validDNIs = ['96241884', '12345678']; // <-- AÑADE AQUÍ LOS DNIs AUTORIZADOS
    let editMode = false;

    // --- DATOS DE GRUPOS DE LIMPIEZA ---
    // Ahora se asignan desde los grupos personalizados.
    let activeCleaningGroupIds = []; // Array con los IDs de los grupos que limpian esta semana.

    // Fecha de inicio para la rotación de grupos (Año, Mes-1, Día).
    let cleaningEpoch = new Date(2024, 0, 1); // 1 de Enero de 2024

    let cleaningRotation = {
        enabled: false,
        groupsPerWeek: 1,
    };

    // Variable para el override manual del grupo de limpieza
    let manualCleaningGroup = null;

    // --- DATOS DE GRUPOS PERSONALIZADOS ---
    let customGroups = {};

    // --- DATOS DE AUDIO/VIDEO ---
    let techUshersProgram = [];
    let techAVProgram = [];

    // --- DATOS DEL EQUIPO TÉCNICO ---
    let techTeam = {};
    const listasTech = {
        audio: document.getElementById('lista-tech-audio'),
        video: document.getElementById('lista-tech-video'),
        plataforma: document.getElementById('lista-tech-plataforma'),
        microfonos: document.getElementById('lista-tech-microfonos'),
        auditorio: document.getElementById('lista-tech-auditorio'),
        entrada: document.getElementById('lista-tech-entrada'),
        estacionamiento: document.getElementById('lista-tech-estacionamiento'),
        camaras: document.getElementById('lista-tech-camaras'),
    };

    function setEditMode(isEditing) {
        editMode = isEditing;
        appContainer.classList.toggle('readonly', !isEditing);

        // Mostrar u ocultar los botones de edición
        cleaningConfigBtn.classList.toggle('hidden', !isEditing);
        navCustomGroupsBtn.classList.toggle('hidden', !isEditing);
        navTechBtn.classList.toggle('hidden', !isEditing);
        navGestorBtn.classList.toggle('hidden', !isEditing);
        navProgramaBtn.classList.toggle('hidden', !isEditing);
        
        // Si se cierra sesión y se estaba en una vista de edición, volver a la pública
        if (!isEditing && (!programaView.classList.contains('hidden') || !gestorView.classList.contains('hidden'))) {
            cambiarVista('public');
        }
    }

    // --- 2. FUNCIONES DE RENDERIZADO Y DATOS ---

    /**
     * Crea un elemento de lista (<li>) para una persona con sus botones de acción.
     * @param {string} nombre - El nombre de la persona.
     * @returns {HTMLElement} El elemento <li> creado.
     */
    function crearElementoPersona(nombre) {
        const li = document.createElement('li');

        // Span para el nombre
        const nombreSpan = document.createElement('span');
        nombreSpan.className = 'person-name';
        nombreSpan.textContent = nombre;

        // Contenedor para los botones
        const accionesDiv = document.createElement('div');
        accionesDiv.className = 'person-actions';

        // Botones de acción
        accionesDiv.innerHTML = `
            <button class="edit-btn" title="Editar nombre">✏️</button>
            <button class="move-btn" title="Cambiar de grupo">🔄</button>
            <button class="delete-btn" title="Eliminar">❌</button>
        `;

        li.appendChild(nombreSpan);
        li.appendChild(accionesDiv);

        return li;
    }

    /**
     * Añade una persona a la lista correspondiente.
     */
    async function procesarAnadirPersona() {
        if (!editMode) {
            Swal.fire('Modo de solo lectura', 'Inicia sesión para realizar cambios.', 'info');
            return;
        }

        const nombre = nombreInput.value.trim();
        const grupo = grupoSelect.value;

        if (nombre === '') {
            Swal.fire({ icon: 'error', title: 'Oops...', text: 'Por favor, introduce un nombre.' });
            return;
        }

        // Comprobar si el nombre ya existe en ese grupo
        const nombresExistentes = Array.from(listas[grupo].querySelectorAll('.person-name')).map(span => span.textContent);
        if (nombresExistentes.includes(nombre)) {
            Swal.fire({ icon: 'warning', title: 'Nombre duplicado', text: `"${nombre}" ya existe en el grupo de ${grupo}.` });
            nombreInput.focus();
            return;
        }

        const nuevoElemento = crearElementoPersona(nombre);
        listas[grupo].appendChild(nuevoElemento);
        guardarDatos();

        nombreInput.value = '';
        nombreInput.focus();

        // Preguntar por lazos familiares
        const { isConfirmed } = await Swal.fire({
            title: `¿Vincular a "${nombre}"?`,
            text: '¿Deseas vincularlo con un familiar ya existente?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, vincular',
            cancelButtonText: 'No, gracias'
        });

        if (isConfirmed) {
            const otrosNombres = obtenerTodosLosNombres().filter(n => n !== nombre);
            if (otrosNombres.length > 0) {
                const inputOptions = {};
                otrosNombres.forEach((n, i) => { inputOptions[i] = n; });

                const { value: seleccion } = await Swal.fire({
                    title: `Selecciona el familiar de "${nombre}"`,
                    input: 'select',
                    inputOptions: inputOptions,
                    inputPlaceholder: 'Selecciona una persona',
                    showCancelButton: true,
                });

                if (seleccion) {
                    const familiar = otrosNombres[parseInt(seleccion, 10)];
                    if (familiar) {
                        gestionarVinculoFamiliar(nombre, familiar);
                    }
                }
            } else {
                Swal.fire('No hay más personas', 'No hay otras personas en las listas para vincular.', 'info');
            }
        }
    }

    /**
     * Recopila todos los nombres de todas las listas.
     * @returns {string[]} Un array con todos los nombres.
     */
    function obtenerTodosLosNombres() {
        const todos = [];
        document.querySelectorAll('.person-name').forEach(span => {
            todos.push(span.textContent);
        });
        // Elimina duplicados y ordena alfabéticamente
        return [...new Set(todos)].sort((a, b) => a.localeCompare(b));
    }

    /**
     * Guarda el estado actual de las listas y el programa en localStorage.
     */
    async function guardarDatos(datos) {
        const datosParaGuardar = {
            listas: {},
            customGroups: customGroups,
            cleaningData: { activeIds: activeCleaningGroupIds, rotation: cleaningRotation, epoch: cleaningEpoch instanceof Date ? cleaningEpoch.toISOString() : cleaningEpoch },
            techUshersProgram: [],
            techTeam: {},
            techAVProgram: [],
            familyTies: familyTies,
            participationDates: datos?.participationDates || {}, // Usar historial existente o uno nuevo
            weekTitles: [],
            assemblyWeeks: [],
            discursoTitles: [],
            maestros: [],
            vidaCristiana: [],
            programas: []
        };

        // Recopilar datos de las listas
        for (const grupoId in listas) {
            datosParaGuardar.listas[grupoId] = [];
            listas[grupoId].querySelectorAll('.person-name').forEach(span => {
                datosParaGuardar.listas[grupoId].push(span.textContent);
            });
        }

        // Recopilar datos del equipo técnico
        for (const grupoId in listasTech) {
            datosParaGuardar.techTeam[grupoId] = [];
            if (listasTech[grupoId]) {
                listasTech[grupoId].querySelectorAll('.person-name').forEach(span => {
                    datosParaGuardar.techTeam[grupoId].push(span.textContent);
                });
            }
        }

        // Recopilar títulos de las semanas
        document.querySelectorAll('.editable-title').forEach(title => {
            datosParaGuardar.weekTitles.push(title.textContent);
        });

        // Recopilar semanas de asamblea
        document.querySelectorAll('.program-week').forEach(weekDiv => {
            const checkbox = weekDiv.querySelector('.assembly-checkbox');
            datosParaGuardar.assemblyWeeks.push(checkbox ? checkbox.checked : false);
        });

        // Recopilar títulos de los discursos de 10min
        programaTables.forEach(table => {
            const titleSpan = table.querySelector('[data-title-part="discurso_10min"]');
            if (titleSpan) {
                datosParaGuardar.discursoTitles.push(titleSpan.textContent);
            }
        });

        // Recopilar datos de la sección "Seamos Mejores Maestros"
        datosParaGuardar.maestros = [];
        programaTables.forEach((table, index) => {
            datosParaGuardar.maestros[index] = [];
            table.querySelectorAll('.maestros-row').forEach(row => {
                const asignados = row.querySelectorAll('.asignable');
                datosParaGuardar.maestros[index].push({
                    titulo: row.querySelector('.assignment-title').textContent,
                    p1: asignados[0] ? asignados[0].textContent : '[ Asignar ]',
                    p2: asignados.length > 1 ? asignados[1].textContent : null
                });
            });
        });

        // Recopilar datos de la sección "Nuestra Vida Cristiana"
        datosParaGuardar.vidaCristiana = [];
        programaTables.forEach((table, index) => {
            datosParaGuardar.vidaCristiana[index] = [];
            table.querySelectorAll('.vida-cristiana-row').forEach(row => {
                const titulo = row.querySelector('.assignment-title').textContent;
                const esCancion = titulo.toLowerCase().includes('canción');
                const asignados = row.querySelectorAll('.asignable');
                const songInput = row.querySelector('.song-number-input');

                datosParaGuardar.vidaCristiana[index].push({
                    titulo: titulo,
                    asignado1: esCancion ? (songInput ? songInput.value : '') : (asignados.length > 0 ? asignados[0].textContent : null),
                    asignado2: esCancion ? null : (asignados.length > 1 ? asignados[1].textContent : null)
                });
            });
        });

        // Recopilar datos de las partes fijas del programa
        datosParaGuardar.programas = [];
        programaTables.forEach((table, index) => {
            datosParaGuardar.programas[index] = {};
            table.querySelectorAll('.asignable').forEach(td => {
                const part = td.dataset.part;
                // Guardar solo si es una parte fija (no de las secciones dinámicas)
                if (part && !part.startsWith('maestros-') && !part.startsWith('vida-cristiana-')) {
                    datosParaGuardar.programas[index][part] = td.textContent;
                }
            });
            // Guardar el número de la canción inicial
            const cancionInput = table.querySelector('input[data-part="cancion_inicial_num"]');
            if (cancionInput) {
                datosParaGuardar.programas[index]['cancion_inicial_num'] = cancionInput.value;
            }
            const cancionTitle = table.querySelector('span[data-title-part="cancion_inicial"]');
            if(cancionTitle) {
                datosParaGuardar.programas[index]['cancion_inicial_title'] = cancionTitle.textContent;
            }
        });

        // Recopilar datos de Audio/Video
        const ushersTable = document.getElementById('ushers-program-table').querySelector('tbody');
        ushersTable.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            datosParaGuardar.techUshersProgram.push({
                fecha: cells[0].textContent,
                auditorio: cells[1].textContent,
                entrada: cells[2].textContent,
                estacionamiento: cells[3].textContent,
                camaras: cells[4].textContent,
            });
        });

        const avTable = document.getElementById('av-program-table').querySelector('tbody');
        avTable.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            datosParaGuardar.techAVProgram.push({
                fecha: cells[0].textContent, video: cells[1].textContent, audio: cells[2].textContent,
                microfono1: cells[3].querySelectorAll('.asignable')[0]?.textContent || '',
                microfono2: cells[3].querySelectorAll('.asignable')[1]?.textContent || '',
                plataforma: cells[4].textContent,
            });
        });

        // En lugar de localStorage, enviamos los datos a nuestra función serverless
        try {
            const response = await fetch('/.netlify/functions/save-data', {
                method: 'POST',
                body: JSON.stringify(datosParaGuardar)
            });
            if (!response.ok) {
                console.error('Error al guardar los datos en el servidor.');
            }
        } catch (error) {
            console.error('Error de red al intentar guardar los datos:', error);
        }

        renderPublicView(); // Actualizar la vista pública cada vez que se guarda
    }

    /**
     * Carga los datos desde localStorage y repuebla la interfaz.
     */
    async function cargarDatos() {
        // Reemplazamos localStorage.getItem con una llamada a nuestra función serverless
        const response = await fetch('/.netlify/functions/get-data');
        const datos = await response.json();
        if (!datos || Object.keys(datos).length === 0) return null; // Devolver null si no hay datos

        // Cargar lazos familiares
        familyTies = datos.familyTies || [];

        // Cargar datos de limpieza
        if (datos.cleaningData) {
            activeCleaningGroupIds = datos.cleaningData.activeIds || [];
            cleaningRotation = datos.cleaningData.rotation || { enabled: false, groupsPerWeek: 1 };
            cleaningEpoch = datos.cleaningData.epoch ? new Date(datos.cleaningData.epoch) : new Date(2024, 0, 1);
        }

        // Cargar grupos personalizados
        customGroups = datos.customGroups || {};

        // Cargar datos de Audio/Video
        if (datos.techUshersProgram) {
            techUshersProgram = datos.techUshersProgram;
        }
        if (datos.techAVProgram) {
            techAVProgram = datos.techAVProgram;
        }
        renderTechTables();


        // Cargar equipo técnico
        if (datos.techTeam) {
            techTeam = datos.techTeam;
            renderTechTeamLists();
        }

        // Limpiar las listas en la UI antes de cargar los datos guardados
        for (const grupoId in listas) {
            if (listas[grupoId]) listas[grupoId].innerHTML = '';
        }

        // Repoblar las listas
        if (datos.listas) {
            for (const grupoId in datos.listas) {
                if (listas[grupoId]) {
                    datos.listas[grupoId].forEach(nombre => {
                        const elementoPersona = crearElementoPersona(nombre);
                        listas[grupoId].appendChild(elementoPersona);
                    });
                }
            }
            actualizarVistaFamiliares();
            renderPublicView(); // Renderizar la vista pública con los datos cargados
        }

        // Repoblar títulos de las semanas
        if (datos.weekTitles && Array.isArray(datos.weekTitles)) {
            document.querySelectorAll('.editable-title').forEach((title, index) => {
                if (datos.weekTitles[index]) {
                    title.textContent = datos.weekTitles[index];
                }
            });
        }

        // Repoblar estado de asambleas
        if (datos.assemblyWeeks && Array.isArray(datos.assemblyWeeks)) {
            datos.assemblyWeeks.forEach((isAssembly, index) => {
                const weekId = index + 1;
                const weekDiv = document.querySelector(`.program-week:has([data-week-id="${weekId}"])`);
                const checkbox = document.querySelector(`.assembly-checkbox[data-week-id="${weekId}"]`);
                if (isAssembly && weekDiv && checkbox) {
                    weekDiv.classList.add('assembly-week');
                    checkbox.checked = true;
                }
            });
        }

        // Repoblar títulos de los discursos
        if (datos.discursoTitles && Array.isArray(datos.discursoTitles)) {
            programaTables.forEach((table, index) => {
                const titleSpan = table.querySelector('[data-title-part="discurso_10min"]');
                if (titleSpan && datos.discursoTitles[index]) {
                    titleSpan.textContent = datos.discursoTitles[index];
                }
            });
        }

        // Repoblar la sección "Seamos Mejores Maestros"
        if (datos.maestros && Array.isArray(datos.maestros)) {
            datos.maestros.forEach((semanaMaestros, index) => {
                if (programaTables[index]) {
                    semanaMaestros.forEach(item => {
                        crearFilaMaestros(index + 1, item.titulo, item.p1, item.p2);
                    });
                }
            });
        }

        // Repoblar la sección "Nuestra Vida Cristiana"
        if (datos.vidaCristiana && Array.isArray(datos.vidaCristiana)) {
            datos.vidaCristiana.forEach((semanaVida, index) => {
                if (programaTables[index]) {
                    semanaVida.forEach(item => {
                        crearFilaVidaCristiana(index + 1, item.titulo, item.asignado1, item.asignado2);
                    });
                }
            });
        }

        // Limpiar historial de personas que ya no existen
        if (datos.participationDates) {
            const todosLosNombres = obtenerTodosLosNombres();
            Object.keys(datos.participationDates).forEach(nombre => {
                if (!todosLosNombres.includes(nombre)) delete datos.participationDates[nombre];
            });
        }

        // Repoblar el programa
        if (datos.programas && Array.isArray(datos.programas)) {
            datos.programas.forEach((semanaPrograma, index) => {
                if (programaTables[index]) {
                    for (const part in semanaPrograma) {
                        const td = programaTables[index].querySelector(`.asignable[data-part="${part}"]`);
                        if (td) {
                            td.textContent = semanaPrograma[part];
                            if (semanaPrograma[part] !== '[ Asignar ]') {
                                td.style.fontStyle = 'normal';
                            }
                        }
                        // Cargar el número de la canción inicial
                        if (part === 'cancion_inicial_num') {
                            const cancionInput = programaTables[index].querySelector('input[data-part="cancion_inicial_num"]');
                            if (cancionInput) cancionInput.value = semanaPrograma[part];
                        } else if (part === 'cancion_inicial_title') {
                            const cancionTitle = programaTables[index].querySelector('span[data-title-part="cancion_inicial"]');
                            if (cancionTitle) cancionTitle.textContent = semanaPrograma[part];
                        }
                    }
                }
            });
        }

        return datos; // Devolver los datos cargados
    }

    /**
     * Crea una nueva fila en la tabla para la sección "Seamos Mejores Maestros".
     * @param {number} tableNum - El número de la tabla (1 a 8).
     * @param {string} [titulo='Nueva asignación'] - El título de la asignación.
     * @param {string} [p1='[ Asignar ]'] - Nombre del primer asignado.
     * @param {string} [p2='[ Asignar ]'] - Nombre del segundo asignado.
     */
    function crearFilaMaestros(tableNum, titulo = 'Nueva asignación', p1 = '[ Asignar ]', p2 = '[ Asignar ]') {
        const targetTable = programaTables[tableNum - 1];
        if (!targetTable) return;

        const newRow = document.createElement('tr');
        newRow.className = 'maestros-row';

        const esDiscurso = titulo.toLowerCase().includes('discurso') || titulo.toLowerCase().includes('explique');

        const asignadosHTML = esDiscurso
            ? `<span class="asignable" data-part="maestros-${Date.now()}">${p1}</span>`
            : `<span class="asignable" data-part="maestros-${Date.now()}-p1">${p1}</span><span class="asignable" data-part="maestros-${Date.now()}-p2">${p2}</span>`;

        newRow.innerHTML = `
            <td>
                <span class="assignment-title" contenteditable="true">${titulo}</span>
                <button class="delete-assignment-btn" title="Eliminar asignación">🗑️</button>
            </td>
            <td>${asignadosHTML}</td>
        `;

        // Insertar la nueva fila antes de la sección "Nuestra Vida Cristiana"
        const vidaCristianaHeader = Array.from(targetTable.querySelectorAll('tr')).find(
            tr => tr.textContent.includes('NUESTRA VIDA CRISTIANA')
        );
        targetTable.insertBefore(newRow, vidaCristianaHeader);

        // Añadir evento para guardar al editar el título
        newRow.querySelector('.assignment-title').addEventListener('blur', async () => { const d = await cargarDatos(); guardarDatos(d); });

        // Añadir evento para eliminar la fila
        newRow.querySelector('.delete-assignment-btn').addEventListener('click', async () => {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: `Se eliminará la asignación "${newRow.querySelector('.assignment-title').textContent}".`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });
            if (result.isConfirmed) {
                newRow.remove();
                const d = await cargarDatos(); guardarDatos(d);
            }
        });

        // Aplicar estilo si ya está asignado
        newRow.querySelectorAll('.asignable').forEach(span => {
            if (span.textContent !== '[ Asignar ]') span.style.fontStyle = 'normal';
        });
    }

    /**
     * Crea una nueva fila en la tabla para la sección "Nuestra Vida Cristiana".
     * @param {number} tableNum - El número de la tabla (1 a 8).
     * @param {string} [titulo='(Nueva parte...)'] - El título del tema.
     * @param {string} [asignado1='[ Asignar ]'] - Nombre del primer asignado (conductor).
     * @param {string} [asignado2=null] - Nombre del segundo asignado (lector).
     */
    function crearFilaVidaCristiana(tableNum, titulo = '(Nueva parte...)', asignado1 = '[ Asignar ]', asignado2 = null) {
        const targetTable = programaTables[tableNum - 1];
        if (!targetTable) return;

        const newRow = document.createElement('tr');
        newRow.className = 'vida-cristiana-row';

        const esEstudioBiblico = titulo.toLowerCase().includes('estudio bíblico');
        const esCancion = titulo.toLowerCase().includes('canción');
        let asignadosHTML;

        if (esEstudioBiblico) {
            asignadosHTML = `<span class="asignable" data-part="vida-cristiana-conductor-${Date.now()}">${asignado1}</span> (Lector: <span class="asignable" data-part="vida-cristiana-lector-${Date.now()}">${asignado2 || '[ Asignar ]'}</span>)`;
        } else if (esCancion) {
            const songNumber = (asignado1 && asignado1 !== '[ Asignar ]') ? asignado1 : '';
            asignadosHTML = `<input type="number" class="song-number-input" value="${songNumber}" placeholder="Nº">`;
        } else {
            asignadosHTML = `<span class="asignable" data-part="vida-cristiana-${Date.now()}">${asignado1}</span>`;
        }

        newRow.innerHTML = `
            <td>
                <span class="assignment-title" contenteditable="true">${titulo}</span>
                <button class="delete-assignment-btn" title="Eliminar parte">🗑️</button>
            </td>
            <td>${asignadosHTML}</td>
        `;

        // Insertar la nueva fila en la posición correcta
        const oracionFinalRow = Array.from(targetTable.querySelectorAll('tr')).find(
            tr => tr.textContent.includes('Oración final')
        );

        if (oracionFinalRow) {
             targetTable.insertBefore(newRow, oracionFinalRow);
        } else {
            targetTable.appendChild(newRow); // Fallback si no se encuentra la oración final
        }

        // Añadir evento para guardar al editar el título
        newRow.querySelector('.assignment-title').addEventListener('blur', async () => { const d = await cargarDatos(); guardarDatos(d); });

        // Añadir evento para guardar al cambiar el número de canción
        if (esCancion) {
            const songInput = newRow.querySelector('.song-number-input');
            if (songInput) {
                songInput.addEventListener('change', async () => { const d = await cargarDatos(); guardarDatos(d); });
            }
        }

        // Añadir evento para eliminar la fila
        const deleteBtn = newRow.querySelector('.delete-assignment-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const result = await Swal.fire({
                    title: '¿Estás seguro?',
                    text: `Se eliminará la parte "${newRow.querySelector('.assignment-title').textContent}".`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                });
                if (result.isConfirmed) {
                    newRow.remove();
                    const d = await cargarDatos(); guardarDatos(d);
                }
            });
        }

        // Aplicar estilo si ya está asignado
        newRow.querySelectorAll('.asignable').forEach(span => {
            if (span.textContent !== '[ Asignar ]') {
                span.style.fontStyle = 'normal';
            }
        });
    }

    function actualizarVistaFamiliares() {
        // Limpiar indicadores previos
        document.querySelectorAll('.family-tie').forEach(el => el.remove());

        familyTies.forEach(tie => {
            const [p1, p2] = tie;
            const el1 = Array.from(document.querySelectorAll('.person-name')).find(span => span.textContent === p1);
            const el2 = Array.from(document.querySelectorAll('.person-name')).find(span => span.textContent === p2);

            if (el1) {
                el1.insertAdjacentHTML('afterend', `<span class="family-tie" title="Familiar de ${p2}">⚭</span>`);
            }
            if (el2) {
                el2.insertAdjacentHTML('afterend', `<span class="family-tie" title="Familiar de ${p1}">⚭</span>`);
            }
        });
    }

    /**
     * Renderiza las listas de miembros del equipo técnico.
     */
    function renderTechTeamLists() {
        // Limpiar listas primero
        for (const grupoId in listasTech) {
            if(listasTech[grupoId]) listasTech[grupoId].innerHTML = '';
        }

        // Poblar listas
        for (const grupoId in techTeam) {
            const listaUI = listasTech[grupoId];
            if (listaUI && techTeam[grupoId]) {
                techTeam[grupoId].forEach(nombre => {
                    const elementoPersona = crearElementoPersona(nombre);
                    // Simplificar acciones: solo eliminar y editar nombre
                    elementoPersona.querySelector('.move-btn').remove();
                    elementoPersona.querySelector('.edit-btn').addEventListener('click', async () => {
                        const { value: newName } = await Swal.fire({
                            title: 'Editar Nombre', input: 'text', inputValue: nombre, showCancelButton: true
                        });
                        if (newName && newName.trim() !== nombre) {
                            const oldName = nombre;
                            techTeam[grupoId] = techTeam[grupoId].map(n => n === oldName ? newName.trim() : n);
                            renderTechTeamLists(); // Renderiza la lista actualizada
                            const d = await cargarDatos(); guardarDatos(d); // Guarda el estado completo
                        }
                    });
                    elementoPersona.querySelector('.delete-btn').addEventListener('click', async () => {
                        const result = await Swal.fire({
                            title: '¿Eliminar Miembro?', text: `Se eliminará a "${nombre}".`, icon: 'warning',
                            showCancelButton: true, confirmButtonText: 'Sí, eliminar'
                        });
                        if (result.isConfirmed) {
                            techTeam[grupoId] = techTeam[grupoId].filter(n => n !== nombre);
                            renderTechTeamLists(); // Renderiza la lista actualizada
                            const d = await cargarDatos(); guardarDatos(d); // Guarda el estado completo
                        }
                    });
                    listaUI.appendChild(elementoPersona);
                });
            }
        }
    }

    /**
     * Añade un nuevo miembro al equipo técnico.
     */
    function addTechTeamMember() {
        const nameInput = document.getElementById('tech-team-name-input');
        const groupSelect = document.getElementById('tech-team-group-select');
        const name = nameInput.value.trim();
        const group = groupSelect.value;

        if (!techTeam[group]) {
            techTeam[group] = [];
        }

        if (name && !techTeam[group].includes(name)) {
            techTeam[group].push(name);
            techTeam[group].sort((a, b) => a.localeCompare(b)); // Mantener ordenado
            renderTechTeamLists();
            cargarDatos().then(d => guardarDatos(d));
            nameInput.value = '';
            nameInput.focus();
        } else if (techTeam[group] && techTeam[group].includes(name)) {
            Swal.fire('Duplicado', `"${name}" ya está en la lista de ${group}.`, 'warning');
        }
    }

    // Eventos para la gestión del equipo técnico
    document.getElementById('add-tech-team-member-btn').addEventListener('click', addTechTeamMember);
    document.getElementById('tech-team-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTechTeamMember();
        }
    });


    /**
     * Renderiza la vista pública del programa.
     */
    function renderPublicView() {
        const container = document.getElementById('public-program-container');
        if (!container) return;

        let htmlContent = '';

        programaTables.forEach((table, index) => {
            const weekDiv = table.closest('.program-week');
            const weekTitle = document.querySelector(`h2[data-week-id="${index + 1}"]`).textContent;
            htmlContent += `
                <div class="program-week">
                    <h2>${weekTitle}</h2>
            `;

            if (weekDiv.classList.contains('assembly-week')) {
                htmlContent += `<div class="assembly-message" style="display: block;">ESTA SEMANA HAY ASAMBLEA</div>`;
            } else {
                htmlContent += `
                    <table class="programa-table">
                        <thead>
                            <tr>
                                <th>Parte de la Reunión</th>
                                <th>Asignado</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                table.querySelectorAll('tr').forEach(row => {
                    if (row.classList.contains('section-header')) {
                        const headerText = row.querySelector('span') ? row.querySelector('span').textContent : row.querySelector('td').textContent;
                        let headerClass = '';
                        if (row.classList.contains('header-tesoros')) headerClass = 'header-tesoros';
                        if (row.classList.contains('header-maestros')) headerClass = 'header-maestros';
                        if (row.classList.contains('header-vida-cristiana')) headerClass = 'header-vida-cristiana';
                        
                        htmlContent += `<tr class="section-header ${headerClass}"><td colspan="2">${headerText}</td></tr>`;
                    } else {
                        const cells = row.querySelectorAll('td');
                        if (cells.length < 2) return;

                        let parte = cells[0].textContent.trim();
                        let asignadoHTML = '';

                        const titleSpan = cells[0].querySelector('.assignment-title');
                        if (titleSpan) parte = titleSpan.textContent.trim();

                        if (row.classList.contains('vida-cristiana-row')) {
                            const esCancion = parte.toLowerCase().includes('canción');
                            const esEstudio = parte.toLowerCase().includes('estudio bíblico');

                            if (esCancion) {
                                const songInput = cells[1].querySelector('.song-number-input');
                                asignadoHTML = songInput && songInput.value ? `Nº ${songInput.value}` : '';
                            } else if (esEstudio) {
                                const asignados = cells[1].querySelectorAll('.asignable');
                                const conductor = asignados[0] ? asignados[0].textContent.trim() : '';
                                const lector = asignados[1] ? asignados[1].textContent.trim() : '';
                                asignadoHTML = `<span class="asignado">${conductor}</span> (Lector: <span class="asignado">${lector}</span>)`;
                            } else {
                                asignadoHTML = `<span class="asignado">${cells[1].textContent.trim()}</span>`;
                            }
                        } else {
                            const asignables = cells[1].querySelectorAll('.asignable');
                            if (asignables.length > 0) {
                                asignadoHTML = Array.from(asignables).map(span => `<span class="asignado">${span.textContent.trim()}</span>`).join(' / ');
                            } else {
                                const songInput = cells[1].querySelector('.song-number-input');
                                if (songInput) {
                                    asignadoHTML = songInput.value ? `Nº ${songInput.value}` : '';
                                } else {
                                    asignadoHTML = `<span class="asignado">${cells[1].textContent.trim()}</span>`;
                                }
                            }
                        }

                        htmlContent += `<tr><td>${parte}</td><td>${asignadoHTML}</td></tr>`;
                    }
                });
                htmlContent += `
                        </tbody>
                    </table>
                `;
            }

            htmlContent += `
                </div>
            `;
        });

        container.innerHTML = htmlContent;

        // --- Botón para mostrar/ocultar programas técnicos ---
        const publicActionsContainer = document.getElementById('public-actions-container');
        const techContainer = document.getElementById('public-tech-programs-container');
        publicActionsContainer.innerHTML = ''; // Limpiar contenedor de acciones

        const hasTechPrograms = (techUshersProgram && techUshersProgram.some(r => Object.values(r).some(v => v))) || 
                                (techAVProgram && techAVProgram.some(r => Object.values(r).some(v => v)));

        if (hasTechPrograms) {
            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = 'Ver Programas Técnicos (Acomodadores, A/V)';
            toggleBtn.className = 'btn-secondary';
            toggleBtn.addEventListener('click', () => {
                const isHidden = techContainer.classList.toggle('hidden');
                toggleBtn.textContent = isHidden 
                    ? 'Ver Programas Técnicos (Acomodadores, A/V)' 
                    : 'Ocultar Programas Técnicos';
            });
            publicActionsContainer.appendChild(toggleBtn);
        }

        // --- Botón para ver Grupos de Congregación ---
        const showCustomGroupsBtn = document.createElement('button');
        showCustomGroupsBtn.textContent = 'Ver Grupos Personalizados';
        showCustomGroupsBtn.className = 'btn-secondary';
        showCustomGroupsBtn.addEventListener('click', () => {
            // Usamos la variable en memoria en lugar de leer de localStorage
            const grupos = customGroups || {};

            let modalHtml = '<div style="display: flex; flex-wrap: wrap; justify-content: space-around; text-align: left;">';

            Object.keys(grupos).forEach(groupId => {
                const group = grupos[groupId];
                if (group.members && group.members.length > 0) {
                    modalHtml += `<div style="flex: 1; min-width: 200px; padding: 10px;">
                                    <h3>${group.name}</h3>
                                    <ul style="list-style-type: none; padding-left: 0;">`;
                    group.members.forEach(nombre => {
                        modalHtml += `<li>${nombre}</li>`;
                    });
                    modalHtml += '</ul></div>';
                }
            });

            modalHtml += '</div>';

            Swal.fire({ title: 'Grupos Personalizados', html: modalHtml, width: '80vw', confirmButtonText: 'Cerrar' });
        });
        publicActionsContainer.appendChild(showCustomGroupsBtn);


        // --- Renderizar Programas Técnicos en la Vista Pública ---
        if (!techContainer) return;

        let techHtmlContent = '';

        if ((techUshersProgram && techUshersProgram.some(r => Object.values(r).some(v => v))) || 
            (techAVProgram && techAVProgram.some(r => Object.values(r).some(v => v)))) {
            
            techHtmlContent += `<header class="programa-header" style="margin-top: 40px;"><h1>Programas Técnicos</h1></header>`;
        }

        // Renderizar Acomodadores si tiene datos
        if (techUshersProgram && techUshersProgram.some(r => Object.values(r).some(v => v))) {
            techHtmlContent += `
                <div class="program-week">
                    <h2>Programa de Acomodadores</h2>
                    <table class="programa-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Auditorio</th>
                                <th>Entrada</th>
                                <th>Estacionamiento</th>
                                <th>Cámaras</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            techUshersProgram.forEach(row => {
                techHtmlContent += `
                    <tr>
                        <td>${row.fecha || ''}</td>
                        <td><span class="asignado">${row.auditorio || ''}</span></td>
                        <td><span class="asignado">${row.entrada || ''}</span></td>
                        <td><span class="asignado">${row.estacionamiento || ''}</span></td>
                        <td><span class="asignado">${row.camaras || ''}</span></td>
                    </tr>
                `;
            });
            techHtmlContent += `</tbody></table></div>`;
        }

        // Renderizar Audio/Video si tiene datos
        if (techAVProgram && techAVProgram.some(r => Object.values(r).some(v => v))) {
            techHtmlContent += `
                <div class="program-week">
                    <h2>Programa de Audio/Video</h2>
                    <table class="programa-table">
                        <thead><tr><th>Fecha</th><th>Video</th><th>Audio</th><th>Micrófonos (2)</th><th>Plataforma</th></tr></thead>
                        <tbody>
            `;
            techAVProgram.forEach(row => {
                const microfonos = [row.microfono1, row.microfono2].filter(Boolean).join(' / ');
                techHtmlContent += `<tr><td>${row.fecha || ''}</td><td><span class="asignado">${row.video || ''}</span></td><td><span class="asignado">${row.audio || ''}</span></td><td><span class="asignado">${microfonos}</span></td><td><span class="asignado">${row.plataforma || ''}</span></td></tr>`;
            });
            techHtmlContent += `</tbody></table></div>`;
        }

        techContainer.innerHTML = techHtmlContent;
    }

    /**
     * Calcula y muestra el aviso del grupo de limpieza.
     */
    function renderCleaningNotice() {
        const container = document.getElementById('cleaning-notice-container');
        if (!container) return;

        let assignedGroups = [];
        const groupIds = Object.keys(customGroups);

        if (cleaningRotation.enabled && groupIds.length > 0) {
            const today = new Date();
            const diffTime = Math.abs(today - cleaningEpoch);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const weekNumber = Math.floor(diffDays / 7);

            const groupsPerWeek = cleaningRotation.groupsPerWeek > 0 ? cleaningRotation.groupsPerWeek : 1;
            const totalCycles = Math.ceil(groupIds.length / groupsPerWeek);
            const currentCycleIndex = weekNumber % totalCycles;

            const startIndex = currentCycleIndex * groupsPerWeek;
            const endIndex = startIndex + groupsPerWeek;
            const assignedIds = groupIds.slice(startIndex, endIndex);

            assignedGroups = assignedIds.map(id => customGroups[id]).filter(Boolean);
        } else {
            assignedGroups = activeCleaningGroupIds.map(id => customGroups[id]).filter(Boolean);
        }

        const noticeDiv = document.createElement('div');
        noticeDiv.className = 'cleaning-notice';
        const groupNames = assignedGroups.length > 0 ? assignedGroups.map(g => g.name).join(' y ') : 'No asignado';
        noticeDiv.innerHTML = `🧹 &nbsp; Limpieza: <b>${groupNames}</b> (clic para ver)`;

        noticeDiv.addEventListener('click', () => {
            if (assignedGroups.length > 0) {
                let allMembers = [];
                let title = 'Integrantes de ';
                assignedGroups.forEach((group, index) => {
                    allMembers = [...allMembers, ...group.members];
                    title += `"${group.name}"${index < assignedGroups.length - 1 ? ' y ' : ''}`;
                });

                const groupMembers = [...new Set(allMembers)]; // Eliminar duplicados si una persona está en ambos grupos
                const membersHtml = groupMembers.map(member => `<li>${member}</li>`).join('');

                Swal.fire({
                    title: title,
                    html: `<ul style="list-style-type: none; padding: 0; text-align: center;">${membersHtml}</ul>`,
                    icon: 'info',
                    confirmButtonText: 'Entendido'
                });
            } else {
                Swal.fire({
                    title: 'Limpieza',
                    text: 'No hay grupos de limpieza asignados para esta semana.',
                    icon: 'warning'
                });
            }
        });

        container.innerHTML = ''; // Limpiar antes de añadir
        container.appendChild(noticeDiv);
    }

    /**
     * Abre la ventana modal para configurar los grupos de limpieza.
     */
    async function abrirConfiguracionLimpieza() {
        let html = `
            <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
                <label style="display: flex; align-items: center; font-size: 1.1em; font-weight: bold;">
                    <input type="checkbox" id="swal-rotation-enabled" class="swal2-checkbox" ${cleaningRotation.enabled ? 'checked' : ''} style="margin-right: 10px;">
                    Habilitar rotación automática
                </label>
            </div>

            <div id="swal-rotation-options" class="${cleaningRotation.enabled ? '' : 'hidden'}" style="margin-bottom: 20px;">
                <div style="margin-bottom: 15px;">
                    <label for="swal-cleaning-epoch" style="display: block; margin-bottom: 5px;">Fecha de inicio de la rotación:</label>
                    <input type="date" id="swal-cleaning-epoch" class="swal2-input" value="${cleaningEpoch.toISOString().split('T')[0]}">
                </div>
                <div>
                    <label for="swal-groups-per-week" style="display: block; margin-bottom: 5px;">Grupos por semana:</label>
                    <input type="number" id="swal-groups-per-week" class="swal2-input" value="${cleaningRotation.groupsPerWeek}" min="1">
                </div>
            </div>

            <div id="swal-manual-options" class="${cleaningRotation.enabled ? 'hidden' : ''}">
                <p style="margin-bottom: 10px; font-weight: bold;">Selección Manual (para esta semana):</p>
                <div class="swal-cleaning-buttons-container">`;
        Object.keys(customGroups).forEach(groupId => {
            const group = customGroups[groupId];
            const isSelected = activeCleaningGroupIds.includes(groupId);
            html += `<button 
                                class="swal-cleaning-group-btn ${isSelected ? 'selected' : ''}" 
                                data-group-id="${groupId}"
                            >${group.name}</button>`;
        });
        html += `</div></div>`;

        const { value: formValues } = await Swal.fire({
            title: 'Ajuste Limpieza',
            html: html,
            width: '600px',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                const container = Swal.getHtmlContainer();
                const rotationCheckbox = container.querySelector('#swal-rotation-enabled');
                const rotationOptions = container.querySelector('#swal-rotation-options');
                const manualOptions = container.querySelector('#swal-manual-options');

                rotationCheckbox.addEventListener('change', () => {
                    rotationOptions.classList.toggle('hidden', !rotationCheckbox.checked);
                    manualOptions.classList.toggle('hidden', rotationCheckbox.checked);
                });
                
                manualOptions.addEventListener('click', (e) => {
                    if (e.target.classList.contains('swal-cleaning-group-btn')) {
                        e.target.classList.toggle('selected');
                    }
                });
            },
            preConfirm: () => {
                const container = Swal.getHtmlContainer();
                const rotationEnabled = container.querySelector('#swal-rotation-enabled').checked;
                const selectedButtons = container.querySelectorAll('#swal-manual-options .swal-cleaning-group-btn.selected');
                const selectedIds = Array.from(selectedButtons).map(btn => btn.dataset.groupId);
                const epochInput = container.querySelector('#swal-cleaning-epoch');
                const epoch = epochInput ? epochInput.value : new Date().toISOString().split('T')[0];
                const groupsPerWeekInput = container.querySelector('#swal-groups-per-week');
                const groupsPerWeek = groupsPerWeekInput ? parseInt(groupsPerWeekInput.value, 10) : 1;

                return {
                    rotation: {
                        enabled: rotationEnabled,
                        groupsPerWeek: groupsPerWeek || 1,
                    },
                    activeIds: selectedIds,
                    epoch: epoch,
                };
            }
        });

        if (formValues) {
            // Actualizar las variables globales
            activeCleaningGroupIds = formValues.activeIds;
            cleaningRotation = formValues.rotation;
            const [year, month, day] = formValues.epoch.split('-').map(Number);
            cleaningEpoch = new Date(year, month - 1, day);

            // Guardar los datos en localStorage
            cargarDatos().then(d => guardarDatos(d)); // La función guardarDatos ya se encarga de todo

            // Volver a renderizar el aviso de limpieza
            renderCleaningNotice();

            Swal.fire('¡Guardado!', 'La configuración de limpieza ha sido actualizada.', 'success');
        }
    }

    /**
     * Renderiza la vista para gestionar los grupos personalizados.
     */
    function renderCustomGroupsManagement() {
        const container = customGroupsView.querySelector('.custom-groups-container');
        if (!container) return;

        container.innerHTML = ''; // Limpiar vista

        Object.keys(customGroups).sort().forEach(groupId => {
            const group = customGroups[groupId];
            const card = document.createElement('div');
            card.className = 'custom-group-card';
            card.innerHTML = `
                <input type="text" value="${group.name}" placeholder="Nombre del Grupo" data-group-id="${groupId}" class="custom-group-name">
                <textarea placeholder="Añade un nombre por línea...">${group.members.join('\n')}</textarea>
                <button class="delete-custom-group-btn" data-group-id="${groupId}">Eliminar Grupo</button>
            `;

            // Evento para guardar al cambiar el nombre del grupo
            card.querySelector('.custom-group-name').addEventListener('change', (e) => {
                customGroups[groupId].name = e.target.value;
                cargarDatos().then(d => guardarDatos(d));
            });

            // Evento para guardar al cambiar el textarea de miembros
            card.querySelector('textarea').addEventListener('change', (e) => {
                const updatedMembers = e.target.value.split('\n').map(name => name.trim()).filter(name => name);
                customGroups[groupId].members = updatedMembers;
                cargarDatos().then(d => guardarDatos(d));
            });

            // Evento para el botón de eliminar
            card.querySelector('.delete-custom-group-btn').addEventListener('click', async (e) => {
                const groupIdToDelete = e.target.dataset.groupId;
                const result = await Swal.fire({
                    title: `¿Eliminar Grupo "${customGroups[groupIdToDelete].name}"?`,
                    text: "Esta acción no se puede deshacer.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar'
                });

                if (result.isConfirmed) {
                    delete customGroups[groupIdToDelete];
                    cargarDatos().then(d => guardarDatos(d));
                    renderCustomGroupsManagement(); // Volver a renderizar la vista
                }
            });

            container.appendChild(card);
        });
    }

    // Evento para el botón de añadir nuevo grupo personalizado
    document.getElementById('add-custom-group-btn').addEventListener('click', () => {
        const newGroupId = `group_${Date.now()}`;
        customGroups[newGroupId] = {
            name: 'Nuevo Grupo',
            members: []
        };
        cargarDatos().then(d => guardarDatos(d));
        renderCustomGroupsManagement();
        Swal.fire({
            title: '¡Grupo añadido!',
            text: 'Ahora puedes cambiarle el nombre y añadir integrantes.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    });

    /**
     * Renderiza las tablas de la sección de Audio/Video.
     */
    function renderTechTables() {
        const ushersTbody = document.getElementById('ushers-program-table').querySelector('tbody');
        const avTbody = document.getElementById('av-program-table').querySelector('tbody');
        ushersTbody.innerHTML = '';
        avTbody.innerHTML = '';

        techUshersProgram.forEach((rowData, index) => {
            const row = createTechRow('ushers', rowData, index);
            ushersTbody.appendChild(row);
        });

        techAVProgram.forEach((rowData, index) => {
            const row = createTechRow('av', rowData, index);
            avTbody.appendChild(row);
        });
    }

    /**
     * Crea una fila para una de las tablas de tecnología.
     * @param {string} type - 'ushers' o 'av'
     * @param {object} data - Los datos para la fila.
     * @param {number} index - El índice de la fila.
     * @returns {HTMLElement} El elemento <tr> creado.
     */
    function createTechRow(type, data = {}, index) {
        const tr = document.createElement('tr');
        let cellsHtml = '';

        if (type === 'ushers') {
            cellsHtml = `
                <td contenteditable="true">${data.fecha || ''}</td>
                <td contenteditable="true">${data.auditorio || ''}</td>
                <td contenteditable="true">${data.entrada || ''}</td>
                <td contenteditable="true">${data.estacionamiento || ''}</td>
                <td contenteditable="true">${data.camaras || ''}</td>
            `;
        } else { // type === 'av'
            cellsHtml = `
                <td contenteditable="true">${data.fecha || ''}</td>
                <td contenteditable="true">${data.video || ''}</td>
                <td contenteditable="true">${data.audio || ''}</td>
                <td><span class="asignable" data-part="microfono1">${data.microfono1 || ''}</span> / <span class="asignable" data-part="microfono2">${data.microfono2 || ''}</span></td>
                <td contenteditable="true">${data.plataforma || ''}</td>
            `;
        }

        tr.innerHTML = `${cellsHtml}<td class="action-col"><button class="delete-tech-row-btn" data-type="${type}" data-index="${index}">🗑️</button></td>`;

        tr.querySelectorAll('td[contenteditable="true"], .asignable').forEach(cell => {
            if (cell.classList.contains('asignable')) {
                cell.setAttribute('contenteditable', 'true');
            }
            cell.addEventListener('blur', async () => { const d = await cargarDatos(); guardarDatos(d); });
        });

        // Evento para eliminar la fila
        tr.querySelector('.delete-tech-row-btn').addEventListener('click', () => {
            if (type === 'ushers') techUshersProgram.splice(index, 1);
            else techAVProgram.splice(index, 1);
            renderTechTables(); // Actualiza la UI
            cargarDatos().then(d => guardarDatos(d)); // Guarda el estado completo
        });

        return tr;
    }

    async function autoAssignUshers() {
        const result = await Swal.fire({
            title: 'Asignar Acomodadores',
            text: 'Esto asignará automáticamente el programa de Acomodadores. ¿Deseas continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, asignar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        while (techUshersProgram.length < 8) {
            techUshersProgram.push({});
        }
        techUshersProgram.length = 8;

        const placeholderNames = ['Juan', 'Pedro', 'Luis', 'Carlos', 'Miguel', 'Andrés', 'Mateo'];

        const pools = {
            auditorio: (techTeam.auditorio && techTeam.auditorio.length > 0 ? [...techTeam.auditorio] : [...placeholderNames]),
            entrada: (techTeam.entrada && techTeam.entrada.length > 0 ? [...techTeam.entrada] : [...placeholderNames]),
            estacionamiento: (techTeam.estacionamiento && techTeam.estacionamiento.length > 0 ? [...techTeam.estacionamiento] : [...placeholderNames]),
            camaras: (techTeam.camaras && techTeam.camaras.length > 0 ? [...techTeam.camaras] : [...placeholderNames]),
        };

        // Barajar cada pool para asegurar la aleatoriedad
        Object.values(pools).forEach(pool => pool.sort(() => Math.random() - 0.5));

        const indices = { auditorio: 0, entrada: 0, estacionamiento: 0, camaras: 0 };

        const getNext = (poolKey, assignedInRow) => {
            const pool = pools[poolKey];
            if (!pool || pool.length === 0) return '';
            for (let i = 0; i < pool.length; i++) {
                const person = pool[indices[poolKey]];
                indices[poolKey] = (indices[poolKey] + 1) % pool.length;
                if (!assignedInRow.has(person)) {
                    return person;
                }
            }
            const person = pool[indices[poolKey]];
            indices[poolKey] = (indices[poolKey] + 1) % pool.length;
            return person;
        };

        const hoy = new Date();
        const diaReunion = 4;
        let primerDia = new Date(hoy);
        primerDia.setDate(primerDia.getDate() + (diaReunion - primerDia.getDay() + 7) % 7);

        for (let i = 0; i < 8; i++) {
            const assignedInRow = new Set();
            const fechaSemana = new Date(primerDia);
            fechaSemana.setDate(fechaSemana.getDate() + (i * 7));
            const fechaFormateada = `${fechaSemana.getDate().toString().padStart(2, '0')}/${(fechaSemana.getMonth() + 1).toString().padStart(2, '0')}`;

            techUshersProgram[i].fecha = fechaFormateada;
            techUshersProgram[i].auditorio = getNext('auditorio', assignedInRow); assignedInRow.add(techUshersProgram[i].auditorio);
            techUshersProgram[i].entrada = getNext('entrada', assignedInRow); assignedInRow.add(techUshersProgram[i].entrada);
            techUshersProgram[i].estacionamiento = getNext('estacionamiento', assignedInRow); assignedInRow.add(techUshersProgram[i].estacionamiento);
            techUshersProgram[i].camaras = getNext('camaras', assignedInRow); assignedInRow.add(techUshersProgram[i].camaras);
        }

        renderTechTables();
        cargarDatos().then(d => guardarDatos(d));
        Swal.fire('¡Listo!', 'Programa de Acomodadores asignado.', 'success');
    }

    async function autoAssignAV() {
        const result = await Swal.fire({
            title: 'Asignar Audio/Video',
            text: 'Esto asignará automáticamente el programa de Audio/Video. ¿Deseas continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, asignar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) return;

        while (techAVProgram.length < 8) {
            techAVProgram.push({});
        }
        techAVProgram.length = 8;

        const pools = {
            audio: [...(techTeam.audio || [])].sort(() => Math.random() - 0.5),
            video: [...(techTeam.video || [])].sort(() => Math.random() - 0.5),
            plataforma: [...(techTeam.plataforma || [])].sort(() => Math.random() - 0.5),
            microfonos: [...(techTeam.microfonos || [])].sort(() => Math.random() - 0.5)
        };

        const indices = { audio: 0, video: 0, plataforma: 0, microfonos: 0 };

        const getNext = (poolKey, assignedInRow) => {
            const pool = pools[poolKey];
            if (!pool || pool.length === 0) return '';
            for (let i = 0; i < pool.length; i++) {
                const person = pool[indices[poolKey]];
                indices[poolKey] = (indices[poolKey] + 1) % pool.length;
                if (!assignedInRow.has(person)) {
                    return person;
                }
            }
            const person = pool[indices[poolKey]];
            indices[poolKey] = (indices[poolKey] + 1) % pool.length;
            return person;
        };

        const hoy = new Date();
        const diaReunion = 4; // Jueves
        let primerDia = new Date(hoy);
        primerDia.setDate(primerDia.getDate() + (diaReunion - primerDia.getDay() + 7) % 7);

        for (let i = 0; i < 8; i++) {
            const assignedInRow = new Set();
            const fechaSemana = new Date(primerDia);
            fechaSemana.setDate(fechaSemana.getDate() + (i * 7));
            const fechaFormateada = `${fechaSemana.getDate().toString().padStart(2, '0')}/${(fechaSemana.getMonth() + 1).toString().padStart(2, '0')}`;

            techAVProgram[i].fecha = fechaFormateada;
            techAVProgram[i].video = getNext('video', assignedInRow); assignedInRow.add(techAVProgram[i].video);
            techAVProgram[i].audio = getNext('audio', assignedInRow); assignedInRow.add(techAVProgram[i].audio);
            techAVProgram[i].microfono1 = getNext('microfonos', assignedInRow); assignedInRow.add(techAVProgram[i].microfono1);
            techAVProgram[i].microfono2 = getNext('microfonos', assignedInRow); assignedInRow.add(techAVProgram[i].microfono2);
            techAVProgram[i].plataforma = getNext('plataforma', assignedInRow); assignedInRow.add(techAVProgram[i].plataforma);
        }

        renderTechTables();
        cargarDatos().then(d => guardarDatos(d));
        Swal.fire('¡Listo!', 'Programa de Audio/Video asignado.', 'success');
    }

    /**
     * Recopila los datos de los programas técnicos y los exporta a un archivo PDF.
     */
    function exportarProgramasTecnicosAPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageHeight = doc.internal.pageSize.height;
        let y = 15;
        const lineHeight = 7;
        const margin = 15;

        const checkPageBreak = () => {
            if (y > pageHeight - 20) {
                doc.addPage();
                y = 20;
            }
        };

        doc.setFontSize(16);
        doc.text("Programas Técnicos", doc.internal.pageSize.width / 2, y, { align: 'center' });
        y += lineHeight * 2;

        // Programa de Acomodadores
        if (techUshersProgram && techUshersProgram.length > 0) {
            checkPageBreak();
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text("Programa de Acomodadores", margin, y);
            y += lineHeight * 1.5;

            doc.autoTable({
                startY: y,
                head: [['Fecha', 'Auditorio', 'Entrada', 'Estacionamiento', 'Cámaras']],
                body: techUshersProgram.map(row => [row.fecha, row.auditorio, row.entrada, row.estacionamiento, row.camaras]),
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [233, 239, 245], textColor: 20 }
            });
            y = doc.lastAutoTable.finalY + 15;
        }

        // Programa de Audio/Video
        if (techAVProgram && techAVProgram.length > 0) {
            checkPageBreak();
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text("Programa de Audio/Video", margin, y);
            y += lineHeight * 1.5;

            doc.autoTable({
                startY: y,
                head: [['Fecha', 'Video', 'Audio', 'Micrófonos (2)', 'Plataforma']],
                body: techAVProgram.map(row => {
                    const microfonos = [row.microfono1, row.microfono2].filter(Boolean).join(' / ');
                    return [row.fecha, row.video, row.audio, microfonos, row.plataforma];
                }),
                theme: 'grid',
                styles: { fontSize: 10 },
                headStyles: { fillColor: [233, 239, 245], textColor: 20 }
            });
            y = doc.lastAutoTable.finalY + 15;
        }

        const fecha = new Date().toISOString().slice(0, 10);
        doc.save(`programas_tecnicos_${fecha}.pdf`);
        Swal.fire('¡Exportado!', 'Los programas técnicos han sido exportados a PDF.', 'success');
    }

    /**
     * Recopila los datos de los programas técnicos y los exporta a un archivo HTML.
     */
    function exportarProgramasTecnicosAHTML() {
        let htmlContent = `
            <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Programas Técnicos</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; background-color: #f0f2f5; }
                .container { max-width: 1000px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1, h2 { text-align: center; color: #3a7ecf; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 40px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #e9eff5; }
            </style>
            </head><body><div class="container"><h1>Programas Técnicos</h1>`;

        if (techUshersProgram && techUshersProgram.length > 0) {
            htmlContent += `<h2>Programa de Acomodadores</h2><table><thead><tr><th>Fecha</th><th>Auditorio</th><th>Entrada</th><th>Estacionamiento</th><th>Cámaras</th></tr></thead><tbody>`;
            techUshersProgram.forEach(row => {
                htmlContent += `<tr><td>${row.fecha || ''}</td><td>${row.auditorio || ''}</td><td>${row.entrada || ''}</td><td>${row.estacionamiento || ''}</td><td>${row.camaras || ''}</td></tr>`;
            });
            htmlContent += `</tbody></table>`;
        }

        if (techAVProgram && techAVProgram.length > 0) {
            htmlContent += `<h2>Programa de Audio/Video</h2><table><thead><tr><th>Fecha</th><th>Video</th><th>Audio</th><th>Micrófonos (2)</th><th>Plataforma</th></tr></thead><tbody>`;
            techAVProgram.forEach(row => {
                const microfonos = [row.microfono1, row.microfono2].filter(Boolean).join(' / ');
                htmlContent += `<tr><td>${row.fecha || ''}</td><td>${row.video || ''}</td><td>${row.audio || ''}</td><td>${microfonos}</td><td>${row.plataforma || ''}</td></tr>`;
            });
            htmlContent += `</tbody></table>`;
        }

        htmlContent += `</div></body></html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'programas_tecnicos.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Swal.fire('¡Compartido!', 'Se ha generado un archivo HTML compartible.', 'success');
    }

    /**
     * Asigna automáticamente el programa basado en reglas.
     */
    async function autoAsignarPrograma() {
        const result = await Swal.fire({
            title: 'Asignación Automática',
            html: '<span style="color: #c0392b;"><b>Recuerda:</b> Asegúrate de haber configurado las partes del programa (como discursos o temas) antes de continuar.</span><br><br>Esto asignará automáticamente los programas. ¿Deseas continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar'
        });
        if (!result.isConfirmed) {
            return;
        }

        // Cargar historial de participación
        const datosGuardados = await cargarDatos();
        const participationDates = datosGuardados.participationDates || {};
        const hoy = new Date();

        const getPersonasPorGrupo = (grupoId) => Array.from(listas[grupoId].querySelectorAll('.person-name')).map(span => span.textContent);

        // Limpiar programas antes de asignar
        limpiarPrograma(false);

        // 1. Crear pools de personas
        const ancianos = getPersonasPorGrupo('ancianos');
        const ministeriales = getPersonasPorGrupo('ministeriales');
        const hermanas = getPersonasPorGrupo('hermanas');
        const publicadores = getPersonasPorGrupo('publicadores');
        const ministerialesYPublicadores = [...ministeriales, ...publicadores];
        
        const ancianosYMinisteriales = [...ancianos, ...ministeriales];
        const hermanos = [
            ...ancianos,
            ...ministeriales,
            ...publicadores
        ];
        const todos = [...hermanos, ...hermanas];

        // Función para barajar un array
        const shuffle = (array) => array.sort(() => Math.random() - 0.5);

        // Barajar los pools para asignaciones aleatorias
        shuffle(hermanas);
        shuffle(ancianos);
        shuffle(ministeriales);
        shuffle(publicadores);
        shuffle(ministerialesYPublicadores);
        shuffle(ancianosYMinisteriales);
        shuffle(hermanos);
        shuffle(todos);

        const nuevasFechasParticipacion = { ...participationDates };

        // Nuevo: Rastreador para asignaciones especiales de ancianos
        const elderSpecialAssignmentCount = new Map(ancianos.map(a => [a, 0]));

        // Helper para obtener la siguiente persona disponible de un pool, respetando un set de ya asignados
        const getNext = (pool, asignadosEstaVez, partType) => {
            const unaSemanaAtras = new Date();
            unaSemanaAtras.setDate(hoy.getDate() - 7); // 1 semana = 7 días

            // Prioridad 1: Candidatos que no han sido asignados en este bloque de 8 semanas
            let candidatos = pool.filter(p => 
                !asignadosEstaVez.has(p)
            );

            // Plan B: Si no hay candidatos únicos, considerar a todos los del pool para reutilización.
            // Esto asegura que se llene el programa incluso con pocas personas.
            if (candidatos.length === 0) {
                candidatos = [...pool];
                if (candidatos.length === 0) return null; // No hay nadie en el pool
            }

            // Lógica especial para partes de ancianos para asegurar distribución
            const specialElderParts = ['presidente', 'necesidades', 'estudio_conductor'];
            if (specialElderParts.includes(partType) && pool.every(p => ancianos.includes(p))) {
                candidatos.sort((a, b) => {
                    const countA = elderSpecialAssignmentCount.get(a) || 0;
                    const countB = elderSpecialAssignmentCount.get(b) || 0;
                    if (countA < countB) return -1; // A es mejor (menos partes especiales)
                    if (countA > countB) return 1;  // B es mejor
                    // Si tienen el mismo número de partes, el que participó hace más tiempo es mejor
                    const lastA = (nuevasFechasParticipacion[a] || []).slice(-1)[0]?.date || 0;
                    const lastB = (nuevasFechasParticipacion[b] || []).slice(-1)[0]?.date || 0;
                    return new Date(lastA) - new Date(lastB);
                });
            }

            // Ordenar candidatos: primero los que no han participado en 2 semanas, o si lo hicieron, que sea en una parte distinta.
            candidatos.sort((a, b) => {
                // Asegurarse de que el historial sea siempre un array
                const histA = Array.isArray(nuevasFechasParticipacion[a]) ? nuevasFechasParticipacion[a] : [];
                const histB = Array.isArray(nuevasFechasParticipacion[b]) ? nuevasFechasParticipacion[b] : [];

                const lastA = histA.length > 0 ? histA[histA.length - 1] : null;
                const lastB = histB.length > 0 ? histB[histB.length - 1] : null;

                // Si no tienen historial, son preferibles
                if (!lastA) return -1;
                if (!lastB) return 1;

                // Si participaron hace más de 1 semana, son preferibles
                if (new Date(lastA.date) < unaSemanaAtras) return -1;
                if (new Date(lastB.date) < unaSemanaAtras) return 1;

                // Dar fuerte prioridad a quienes NO han tenido este tipo de parte en el bloque actual.
                const aTuvoEsteTema = histA.some(h => h.part === partType);
                const bTuvoEsteTema = histB.some(h => h.part === partType);

                if (aTuvoEsteTema && !bTuvoEsteTema) return 1;  // B es mejor porque no ha tenido este tema.
                if (!aTuvoEsteTema && bTuvoEsteTema) return -1; // A es mejor.

                // Si ambos (o ninguno) han tenido este tema, priorizar al que participó hace más tiempo en general.
                if (lastA.date < lastB.date) {
                    return -1; // A participó hace más tiempo, es mejor.
                } else if (lastA.date > lastB.date) {
                    return 1;  // B participó hace más tiempo, es mejor.
                }
                return new Date(lastA.date) - new Date(lastB.date);
            });

            if (candidatos.length > 0) {
                const persona = candidatos[0];
                asignadosEstaVez.add(persona);
                // Si el historial no es un array (formato antiguo), se convierte a uno nuevo
                if (!Array.isArray(nuevasFechasParticipacion[persona])) {
                    nuevasFechasParticipacion[persona] = [];
                }
                if (specialElderParts.includes(partType)) {
                    const currentCount = elderSpecialAssignmentCount.get(persona) || 0;
                    elderSpecialAssignmentCount.set(persona, currentCount + 1);
                }
                nuevasFechasParticipacion[persona].push({ date: hoy.toISOString(), part: partType });
                return persona;
            }

            return null;
        };

        // Helper para verificar si son familia
        const sonFamilia = (p1, p2) => {
            if (!p1 || !p2) return false;
            return familyTies.some(tie => (tie.includes(p1) && tie.includes(p2)));
        };

        // Helper para verificar si es anciano o ministerial
        const esAncianoOMinisterial = (persona) => {
            return ancianosYMinisteriales.includes(persona);
        };

        const esHermana = (persona) => { // eslint-disable-line no-unused-vars
            return hermanas.includes(persona);
        };

        // --- FUNCIÓN PARA ASIGNAR UNA SEMANA ---
        const assignWeek = (table, asignadosEstaSemana, historialParejas, asignadosSemanaAnterior) => {
            // Si la semana es de asamblea, no asignar nada.
            const weekDiv = table.closest('.program-week');
            if (weekDiv.classList.contains('assembly-week')) {
                return;
            }

            // Asignar Presidente (solo ancianos)
            const celdaPresidente = table.querySelector('[data-part="presidente"]');
            if (celdaPresidente) {
                const persona = getNext(ancianos, asignadosEstaSemana, 'presidente');
                if (persona) {
                    celdaPresidente.textContent = persona;
                    celdaPresidente.style.fontStyle = 'normal';
                } else {
                    celdaPresidente.textContent = '[ Faltan Anc. ]';
                }
            }

            // Asignar Oraciones (Ancianos y Ministeriales)
            const celdaOracionInicial = table.querySelector('[data-part="oracion_inicial"]');
            if (celdaOracionInicial) {
                const persona = getNext(ancianosYMinisteriales, asignadosEstaSemana, 'oracion');
                if (persona) {
                    celdaOracionInicial.textContent = persona;
                    celdaOracionInicial.style.fontStyle = 'normal';
                } else {
                    celdaOracionInicial.textContent = '[ Faltan A./S.M. ]';
                }
            }
            const celdaOracionFinal = table.querySelector('[data-part="oracion_final"]');
            if (celdaOracionFinal) {
                const persona = getNext(ancianosYMinisteriales, asignadosEstaSemana, 'oracion');
                if (persona) {
                    celdaOracionFinal.textContent = persona;
                    celdaOracionFinal.style.fontStyle = 'normal';
                } else {
                    celdaOracionFinal.textContent = '[ Faltan A./S.M. ]';
                }
            }

            // 2. Asignar Lectura de la Biblia (solo publicadores)
            const celdaLectura = table.querySelector('[data-part="lectura"]');
            if (celdaLectura) {
                const persona = getNext(publicadores, asignadosEstaSemana, 'lectura');
                if (persona) {
                    celdaLectura.textContent = persona;
                    celdaLectura.style.fontStyle = 'normal';
                } else {
                    celdaLectura.textContent = '[ Faltan Pub. ]';
                }
            }

            // 4. Asignar Discurso de Tesoros (Ancianos y Ministeriales)
            const celdaDiscursoTesoros = table.querySelector('[data-part="discurso"]');
            if (celdaDiscursoTesoros) {
                const persona = getNext(ancianosYMinisteriales, asignadosEstaSemana, 'discurso_10min');
                if (persona) {
                    celdaDiscursoTesoros.textContent = persona;
                    celdaDiscursoTesoros.style.fontStyle = 'normal';
                } else {
                    celdaDiscursoTesoros.textContent = '[ Faltan A./S.M. ]';
                }
            }

            // 5. Asignar resto de partes fijas (solo hermanos)
            table.querySelectorAll('[data-part="perlas"]').forEach(celda => { // Perlas Escondidas: Ancianos y Ministeriales
                const persona = getNext(ancianosYMinisteriales, asignadosEstaSemana, 'perlas');
                if (persona) {
                    celda.textContent = persona;
                    celda.style.fontStyle = 'normal';
                } else {
                    celda.textContent = '[ Faltan A./S.M. ]';
                }
            });

            // 6. Asignar partes dinámicas de "Nuestra Vida Cristiana"
            table.querySelectorAll('.vida-cristiana-row').forEach(row => {
                const celdas = row.querySelectorAll('.asignable');
                const titulo = row.querySelector('.assignment-title').textContent.toLowerCase();

                if (titulo.includes('estudio bíblico')) {
                    // Conductor (solo ancianos)
                    const conductor = getNext(ancianos, asignadosEstaSemana, 'estudio_conductor');
                    celdas[0].textContent = conductor || '[ Faltan Anc. ]';
                    celdas[0].style.fontStyle = conductor ? 'normal' : 'italic';
                    // Lector (ancianos y siervos ministeriales)
                    const lector = getNext(ancianosYMinisteriales, asignadosEstaSemana, 'estudio_lector');
                    celdas[1].textContent = lector || '[ Faltan A./S.M. ]';
                    celdas[1].style.fontStyle = lector ? 'normal' : 'italic';
                } else if (titulo.includes('necesidades de la congregación')) {
                    // Necesidades de la congregación (solo ancianos)
                    const persona = getNext(ancianos, asignadosEstaSemana, 'necesidades');
                    celdas[0].textContent = persona || '[ Faltan Anc. ]';
                    celdas[0].style.fontStyle = persona ? 'normal' : 'italic';
                } else if (titulo.includes('canción')) {
                    // La canción no se asigna automáticamente
                    return;
                } else {
                    // Otras partes (por defecto, un hermano)
                    const persona = getNext(hermanos, asignadosEstaSemana, 'vida_cristiana_otro');
                    celdas[0].textContent = persona || '[ Faltan H. ]';
                    celdas[0].style.fontStyle = persona ? 'normal' : 'italic';
                }
            });

            // 7. Asignar "Seamos Mejores Maestros" - Lógica mejorada
            const todasLasFilasMaestros = Array.from(table.querySelectorAll('.maestros-row'));
            const partesHermanas = [];
            const partesHermanos = [];

            todasLasFilasMaestros.forEach(row => {
                const titulo = row.querySelector('.assignment-title').textContent.toLowerCase();
                if (titulo.includes('conversaci') || titulo.includes('revisita') || titulo.includes('curso bíblico')) {
                    partesHermanas.push(row);
                } else {
                    partesHermanos.push(row);
                }
            });

            // Asignar partes de hermanos (discursos)
            partesHermanos.forEach(row => {
                const celdasAsignables = row.querySelectorAll('.asignable');
                const persona = getNext(hermanos, asignadosEstaSemana, 'maestros_discurso');
                if (celdasAsignables.length > 0) {
                    celdasAsignables[0].textContent = persona || '[ Faltan H. ]';
                    celdasAsignables[0].style.fontStyle = persona ? 'normal' : 'italic';
                }
            });

            // Asignar partes de hermanas (demostraciones y cursos)
            let hermanasDisponibles = hermanas.filter(p => !asignadosEstaSemana.has(p));
            shuffle(hermanasDisponibles);

            partesHermanas.forEach(row => {
                const titulo = row.querySelector('.assignment-title').textContent.toLowerCase();
                const celdasAsignables = row.querySelectorAll('.asignable');
                
                // Lógica de asignación de parejas MUY mejorada
                let p1 = null;
                let p2 = null;

                if (hermanasDisponibles.length >= 2) {
                    let mejorPareja = null;
                    let mejorPuntuacion = -Infinity;

                    // Evaluar todas las combinaciones de parejas posibles
                    for (let i = 0; i < hermanasDisponibles.length; i++) {
                        for (let j = i + 1; j < hermanasDisponibles.length; j++) {
                            const h1 = hermanasDisponibles[i];
                            const h2 = hermanasDisponibles[j];
                            const parNormalizado = [h1, h2].sort().join('|');
                            const penalidadPareja = (historialParejas[parNormalizado] || 0) * 100;

                            // Puntuación con h1 como conductora
                            const puntuacion1 = calcularPuntuacion(h1, `_conductor`, asignadosSemanaAnterior) + calcularPuntuacion(h2, `_ayudante`, asignadosSemanaAnterior) - penalidadPareja;
                            // Puntuación con h2 como conductora
                            const puntuacion2 = calcularPuntuacion(h2, `_conductor`, asignadosSemanaAnterior) + calcularPuntuacion(h1, `_ayudante`, asignadosSemanaAnterior) - penalidadPareja;

                            if (puntuacion1 > mejorPuntuacion) {
                                mejorPuntuacion = puntuacion1;
                                mejorPareja = [h1, h2];
                            }
                            if (puntuacion2 > mejorPuntuacion) {
                                mejorPuntuacion = puntuacion2;
                                mejorPareja = [h2, h1];
                            }
                        }
                    }

                    if (mejorPareja) {
                        p1 = mejorPareja[0];
                        p2 = mejorPareja[1];

                        // Asignar y registrar
                        celdasAsignables[0].textContent = p1;
                        celdasAsignables[1].textContent = p2;
                        celdasAsignables[0].style.fontStyle = 'normal';
                        celdasAsignables[1].style.fontStyle = 'normal';

                        // Eliminar de disponibles para esta semana
                        hermanasDisponibles = hermanasDisponibles.filter(h => h !== p1 && h !== p2);
                        asignadosEstaSemana.add(p1);
                        asignadosEstaSemana.add(p2);

                        // Registrar historial
                        if (!Array.isArray(nuevasFechasParticipacion[p1])) nuevasFechasParticipacion[p1] = [];
                        nuevasFechasParticipacion[p1].push({ date: hoy.toISOString(), part: `_conductor` });
                        if (!Array.isArray(nuevasFechasParticipacion[p2])) nuevasFechasParticipacion[p2] = [];
                        nuevasFechasParticipacion[p2].push({ date: hoy.toISOString(), part: `_ayudante` });
                        const parAsignado = [p1, p2].sort().join('|');
                        historialParejas[parAsignado] = (historialParejas[parAsignado] || 0) + 1;
                    }
                }

                if (!p1 || !p2) {
                    celdasAsignables[0].textContent = '[ Faltan Hnas. ]';
                    celdasAsignables[1].textContent = '[ Faltan Hnas. ]';
                }
            });

        };

        // Función para calcular qué tan "necesaria" es una asignación para una hermana
        function calcularPuntuacion(hermana, partType, asignadosSemanaAnterior) {
            const historial = nuevasFechasParticipacion[hermana] || [];
            const dosSemanasAtras = new Date();
            dosSemanasAtras.setDate(hoy.getDate() - 14);

            // Prioridad ABSOLUTA: Si nunca ha participado, es la candidata ideal.
            if (historial.length === 0) {
                return 5000; // Puntuación muy alta para asegurar su selección.
            }

            let puntuacion = 1000; // Puntuación base.

            // Prioridad MÁXIMA: No haber participado la semana anterior.
            if (asignadosSemanaAnterior && asignadosSemanaAnterior.has(hermana)) {
                return -5000; // Penalización masiva para descartarla casi por completo.
            }

            const ultimaParticipacion = historial.length > 0 ? new Date(historial[historial.length - 1].date) : null;

            // Prioridad 1: Descanso de 2 o más semanas.
            if (ultimaParticipacion && ultimaParticipacion < dosSemanasAtras) {
                puntuacion += 500; // Gran bonificación por estar "descansada"
            }

            // Prioridad 2: Variedad de temas. Penalizar si ya ha tenido esta parte exacta.
            if (historial.some(h => h.part === partType)) {
                puntuacion -= 100;
            }

            // Prioridad 3: Menor participación general.
            puntuacion -= historial.length * 10;

            return puntuacion;
        }

        // --- EJECUTAR ASIGNACIÓN PARA LAS 8 SEMANAS ---
        const historialParejas = {}; // Historial de parejas para este bloque
        let asignadosSemanaAnterior = new Set();

        programaTables.forEach(table => {
            // Se crea un nuevo Set para cada semana para asegurar que nadie se repita DENTRO de la misma semana.
            const asignadosEstaSemana = new Set();
            assignWeek(table, asignadosEstaSemana, historialParejas, asignadosSemanaAnterior);
            asignadosSemanaAnterior = asignadosEstaSemana; // Para la siguiente iteración, la "semana anterior" es la que acabamos de asignar.
        });

        // Guardar el historial actualizado
        const datosParaGuardar = { ...datosGuardados, participationDates: nuevasFechasParticipacion };
        await guardarDatos(datosParaGuardar);

        Swal.fire('¡Listo!', 'Programa asignado automáticamente.', 'success');
    }

    async function limpiarPrograma(confirmar = true) {
        if (confirmar) {
            const result = await Swal.fire({
                title: '¿Limpiar Programas?',
                text: 'Esto borrará todas las asignaciones y temas personalizados. ¿Deseas continuar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, limpiar',
                cancelButtonText: 'Cancelar'
            });
            if (!result.isConfirmed) return;
        }

        // 1. Limpiar la UI
        // Resetear asignaciones fijas
        document.querySelectorAll('.programa-table .asignable').forEach(celda => {
            celda.textContent = '[ Asignar ]';
            celda.style.fontStyle = 'italic';
        });
        // Resetear títulos de semana y discursos
        document.querySelectorAll('.editable-title').forEach((title, index) => title.textContent = `Semana ${index + 1}`);
        document.querySelectorAll('[data-title-part="discurso_10min"]').forEach(title => title.textContent = 'Discurso 10min');
        // Resetear canciones
        document.querySelectorAll('.song-number-input').forEach(input => input.value = '');
        document.querySelectorAll('[data-title-part="cancion_inicial"]').forEach(span => span.textContent = 'Canción');
        // Resetear semanas de asamblea
        document.querySelectorAll('.assembly-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.program-week').forEach(week => week.classList.remove('assembly-week'));

        // 2. Reconstruir filas dinámicas
        document.querySelectorAll('.maestros-row, .vida-cristiana-row').forEach(row => row.remove());
        programaTables.forEach((table, index) => {
            inicializarFilasPorDefecto(table, index);
        });

        // 3. Guardar el estado limpio
        cargarDatos().then(d => guardarDatos(d));

        if (confirmar) {
            Swal.fire('¡Listo!', 'El programa ha sido limpiado.', 'success');
        }
    }

    /**
     * Recopila los datos del programa y los exporta a un archivo PDF.
     */
    function exportarProgramaAPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageHeight = doc.internal.pageSize.height;
        let y = 15; // Posición vertical inicial
        const lineHeight = 7;
        const margin = 15;

        const checkPageBreak = () => {
            if (y > pageHeight - 20) { // Si estamos cerca del final de la página
                doc.addPage();
                y = 20; // Reiniciar posición en la nueva página
            }
        };

        // Título principal
        doc.setFontSize(16);
        doc.text("Programa de la Reunión Vida y Ministerio Cristianos", doc.internal.pageSize.width / 2, y, { align: 'center' });
        y += lineHeight * 2;

        programaTables.forEach((table, index) => {
            const weekDiv = table.closest('.program-week');
            checkPageBreak();
            const weekTitle = document.querySelector(`[data-week-id="${index + 1}"]`).textContent;
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`--- ${weekTitle.toUpperCase()} ---`, margin, y);
            if (weekDiv.classList.contains('assembly-week')) {
                doc.setFont(undefined, 'normal');
                doc.text("ASAMBLEA", margin + 60, y);
                y += lineHeight * 2;
                return; // Saltar al siguiente ciclo
            }
            doc.setFont(undefined, 'normal');
            y += lineHeight * 1.5;

            table.querySelectorAll('tr').forEach(row => {
                checkPageBreak();
                if (row.classList.contains('section-header')) {
                    y += lineHeight * 0.5; // Espacio extra antes del encabezado
                    const headerSpan = row.querySelector('span');
                    // Manejar ambos tipos de encabezados (con y sin span)
                    const headerText = headerSpan 
                        ? headerSpan.textContent 
                        : row.querySelector('td').textContent;

                    doc.setFontSize(11);
                    doc.setFont(undefined, 'bold');
                    doc.text(`** ${headerText.toUpperCase()} **`, margin, y);
                    doc.setFont(undefined, 'normal');
                    y += lineHeight;
                } else {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 2) return;

                    let parte = cells[0].textContent.trim();
                    let asignado = '';
                    const titleSpan = cells[0].querySelector('.assignment-title');
                    const songInput = cells[1].querySelector('.song-number-input');

                    if (songInput) { // Manejar la fila de la canción inicial
                        asignado = `Nº ${songInput.value}`;
                    }
                    if (titleSpan) parte = titleSpan.textContent.trim();

                    if (row.classList.contains('vida-cristiana-row')) {
                        const esCancion = parte.toLowerCase().includes('canción');
                        const esEstudio = parte.toLowerCase().includes('estudio bíblico');
                        if (esCancion) {
                            const songInput = cells[1].querySelector('.song-number-input');
                            asignado = songInput ? `Nº ${songInput.value}` : '';
                        } else if (esEstudio) {
                            const asignados = cells[1].querySelectorAll('.asignable');
                            const conductor = asignados[0] ? asignados[0].textContent.trim() : '[ Asignar ]';
                            const lector = asignados[1] ? asignados[1].textContent.trim() : '[ Asignar ]';
                            asignado = `${conductor} (Lector: ${lector})`;
                        } else {
                            asignado = cells[1].textContent.trim();
                        }
                    } else {
                        const asignables = cells[1].querySelectorAll('.asignable');
                        if (asignables.length > 0) {
                            asignado = Array.from(asignables).map(span => span.textContent.trim()).join(' / ');
                        } else {
                            asignado = cells[1].textContent.trim();
                        }
                    }
                    
                    doc.setFontSize(10);
                    doc.text(`${parte}:`, margin, y);
                    doc.text(asignado, margin + 60, y);
                    y += lineHeight;
                }
            });
            y += lineHeight; // Espacio entre semanas
        });

        const fecha = new Date().toISOString().slice(0, 10);
        doc.save(`programa_reunion_${fecha}.pdf`);

        alert('El programa ha sido exportado a un archivo PDF.');
    }

    /**
     * Recopila los datos del programa y los exporta a un archivo HTML independiente.
     */
    function exportarProgramaAHTML() {
        let htmlContent = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Programa de la Reunión</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f2f5; color: #333; padding: 20px; }
                    .app-container { max-width: 900px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden; }
                    .programa-header { padding: 20px; text-align: center; background-color: #f7f7f7; border-bottom: 1px solid #e0e0e0; font-size: 1.2em; }
                    .programa-container { padding: 20px; }
                    .program-week { margin-bottom: 30px; }
                    .program-week h2 { text-align: center; margin-bottom: 15px; font-size: 20px; color: #3a7ecf; }
                    .programa-table { width: 100%; border-collapse: collapse; font-size: 15px; }
                    .programa-table th, .programa-table td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
                    .programa-table th { background-color: #e9eff5; font-weight: 600; }
                    .programa-table .section-header td { color: white; font-weight: bold; text-align: center; }
                    .programa-table .header-tesoros td { background-color: #808080; }
                    .programa-table .header-maestros td { background-color: #d4a017; }
                    .programa-table .header-vida-cristiana td { background-color: #800000; }
                    .asignado { color: #007aff; font-weight: 500; }
                    .asignado-pareja { color: #34c759; font-weight: 500; }
                </style>
            </head>
            <body>
                <div class="app-container">
                    <header class="programa-header">
                        <h1>Programa de la Reunión Vida y Ministerio Cristianos</h1>
                    </header>
                    <div class="programa-container">
        `;

        programaTables.forEach((table, index) => {
            const weekDiv = table.closest('.program-week');
            const weekTitle = document.querySelector(`[data-week-id="${index + 1}"]`).textContent;
            htmlContent += `
                <div class="program-week">
                    <h2>${weekTitle}</h2>
            `;

            if (weekDiv.classList.contains('assembly-week')) {
                htmlContent += `<div style="text-align:center; padding: 40px; font-size: 1.5em; color: #c0392b;">ASAMBLEA</div>`;
            } else {
                htmlContent += `
                    <table class="programa-table">
                        <thead>
                            <tr>
                                <th>Parte de la Reunión</th>
                                <th>Asignado</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                table.querySelectorAll('tr').forEach(row => {
                    if (row.classList.contains('section-header')) {
                        const classList = Array.from(row.classList).join(' ');
                        const headerText = row.querySelector('span') ? row.querySelector('span').textContent : row.querySelector('td').textContent;
                        htmlContent += `<tr class="${classList}"><td colspan="2">${headerText}</td></tr>`;
                    } else {
                        const cells = row.querySelectorAll('td');
                        if (cells.length < 2) return;

                        let parte = cells[0].textContent.trim();
                        let asignadoHTML = '';

                        const titleSpan = cells[0].querySelector('.assignment-title');
                        if (titleSpan) parte = titleSpan.textContent.trim();

                        if (row.classList.contains('vida-cristiana-row')) {
                            const esCancion = parte.toLowerCase().includes('canción');
                            const esEstudio = parte.toLowerCase().includes('estudio bíblico');

                            if (esCancion) {
                                const songInput = cells[1].querySelector('.song-number-input');
                                asignadoHTML = songInput ? `Nº ${songInput.value}` : '';
                            } else if (esEstudio) {
                                const asignados = cells[1].querySelectorAll('.asignable');
                                const conductor = asignados[0] ? asignados[0].textContent.trim() : '';
                                const lector = asignados[1] ? asignados[1].textContent.trim() : '';
                                asignadoHTML = `<span class="asignado">${conductor}</span> (Lector: <span class="asignado">${lector}</span>)`;
                            } else {
                                asignadoHTML = `<span class="asignado">${cells[1].textContent.trim()}</span>`;
                            }
                        } else {
                            const asignables = cells[1].querySelectorAll('.asignable');
                            if (asignables.length > 0) {
                                asignadoHTML = Array.from(asignables).map(span => `<span class="${asignables.length > 1 ? 'asignado-pareja' : 'asignado'}">${span.textContent.trim()}</span>`).join(' / ');
                            } else {
                                asignadoHTML = `<span class="asignado">${cells[1].textContent.trim()}</span>`;
                            }
                        }

                        htmlContent += `<tr><td>${parte}</td><td>${asignadoHTML}</td></tr>`;
                    }
                });
                htmlContent += `
                        </tbody>
                    </table>
                `;
            }

            htmlContent += `
                </div>
            `;
        });

        htmlContent += `
                    </div>
                </div>
            </body>
            </html>
        `;

        // Crear y descargar el archivo HTML
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'programa_compartido.html';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert('Se ha generado un archivo HTML compartible.');
    }


    // --- 3. MANEJO DE EVENTOS ---

    // Evento para el botón principal "Añadir Persona"
    anadirBtn.addEventListener('click', procesarAnadirPersona);

    // Evento para añadir con la tecla "Enter"
    nombreInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            procesarAnadirPersona();
        }
    });

    // Delegación de eventos para los botones de acción (editar, mover, eliminar)
    listsContainer.addEventListener('click', async (event) => {
        if (!editMode) {
            // En modo de solo lectura, no hacer nada con los botones de acción
            return;
        }

        const target = event.target;
        const li = target.closest('li'); // Encuentra el <li> padre más cercano

        if (!li) return; // Si no se hizo clic en un <li>, salir

        const nombreSpan = li.querySelector('.person-name');

        // --- Lógica para ELIMINAR ---
        if (target.classList.contains('delete-btn')) {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: `Se eliminará a "${nombreSpan.textContent}" de forma permanente.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });
            if (result.isConfirmed) {
                li.remove();
                cargarDatos().then(d => guardarDatos(d));
            }
        }

        // --- Lógica para EDITAR ---
        if (target.classList.contains('edit-btn')) {
            const oldName = nombreSpan.textContent;
            const { value: nuevoNombre } = await Swal.fire({
                title: 'Editar nombre',
                input: 'text',
                inputValue: oldName,
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value || value.trim() === '') {
                        return '¡Necesitas escribir un nombre!';
                    }
                }
            });

            if (nuevoNombre) {
                const trimmedNewName = nuevoNombre.trim();
                if (trimmedNewName !== oldName) {
                    // 1. Actualizar nombre en la UI
                    nombreSpan.textContent = trimmedNewName;

                    // 2. Actualizar nombre en todas las estructuras de datos
                    familyTies = familyTies.map(tie => tie.map(p => (p === oldName ? trimmedNewName : p)));

                    // Actualizar nombre en el programa si estaba asignado
                    programaTables.forEach(table => {
                        table.querySelectorAll('.asignable').forEach(celda => {
                            if (celda.textContent === oldName) {
                                celda.textContent = trimmedNewName;
                            }
                        });
                    });
                    cargarDatos().then(d => guardarDatos(d)); // Guardar todos los cambios
                }
            }

            // 3. Después del cambio de nombre (o si no hubo cambio), ofrecer gestionar vínculos familiares
            const { isConfirmed: manageFamily } = await Swal.fire({
                title: 'Vínculos Familiares',
                text: `¿Deseas gestionar los vínculos familiares de "${nombreSpan.textContent}"?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, gestionar',
                cancelButtonText: 'No'
            });

            if (manageFamily) {
                const currentPerson = nombreSpan.textContent;
                const otrosNombres = obtenerTodosLosNombres().filter(n => n !== currentPerson);

                if (otrosNombres.length > 0) {
                    const inputOptions = {};
                    otrosNombres.forEach((nombre, i) => {
                        const esFamiliar = sonFamilia(currentPerson, nombre);
                        inputOptions[i] = `${nombre} ${esFamiliar ? '⚭ (desvincular)' : '(vincular)'}`;
                    });

                    const { value: seleccion } = await Swal.fire({
                        title: `Gestionar familiar de "${currentPerson}"`,
                        input: 'select',
                        inputOptions: inputOptions,
                        inputPlaceholder: 'Selecciona una persona',
                        showCancelButton: true,
                    });

                    if (seleccion) {
                        const familiarSeleccionado = otrosNombres[parseInt(seleccion, 10)];
                        gestionarVinculoFamiliar(currentPerson, familiarSeleccionado);
                    }
                } else {
                    Swal.fire('No hay más personas', 'No hay otras personas en las listas para vincular.', 'info');
                }
            }
        }

        // --- Lógica para MOVER ---
        if (target.classList.contains('move-btn')) {
            const grupoActualId = li.parentElement.id.replace('lista-', ''); // e.g., 'ancianos'
            const gruposDisponibles = Object.keys(listas).filter(key => key !== grupoActualId);

            moveMenu.innerHTML = ''; // Limpiar menú anterior

            gruposDisponibles.forEach(grupo => {
                const button = document.createElement('button');
                button.textContent = `Mover a ${grupo.charAt(0).toUpperCase() + grupo.slice(1)}`;
                button.onclick = () => {
                    listas[grupo].appendChild(li); // Mueve el elemento en la UI
                    cargarDatos().then(d => guardarDatos(d)); // Guarda el estado completo
                    moveMenu.classList.add('hidden');
                };
                moveMenu.appendChild(button);
            });

            // Posicionar el menú cerca del botón que se clickeó
            const rect = target.getBoundingClientRect();
            moveMenu.style.top = `${rect.bottom + window.scrollY}px`;
            moveMenu.style.left = `${rect.left + window.scrollX - moveMenu.offsetWidth + rect.width}px`;
            moveMenu.classList.remove('hidden');

            // Ocultar el menú si se hace clic en cualquier otro lugar
            const hideMenu = (e) => {
                if (!moveMenu.contains(e.target) && e.target !== target) {
                    moveMenu.classList.add('hidden');
                    document.removeEventListener('click', hideMenu);
                }
            };
            // Usamos un timeout para que el listener no se active con el mismo clic que abre el menú
            setTimeout(() => {
                document.addEventListener('click', hideMenu);
            }, 0);
        }
    });

    function gestionarVinculoFamiliar(p1, p2) {
        const indiceVinculo = familyTies.findIndex(tie => (tie.includes(p1) && tie.includes(p2)));

        if (indiceVinculo > -1) {
            // Si ya son familia, se desvinculan
            familyTies.splice(indiceVinculo, 1);
            Swal.fire('Vínculo eliminado', `"${p1}" y "${p2}" ya no están vinculados como familia.`, 'info');
        } else {
            // Si no son familia, se vinculan
            familyTies.push([p1, p2]);
            Swal.fire('¡Vinculados!', `"${p1}" y "${p2}" ahora están vinculados como familia.`, 'success');
        }

        cargarDatos().then(d => guardarDatos(d));
        actualizarVistaFamiliares();
    }

    // --- 4. LÓGICA DE NAVEGACIÓN Y VISTA DE PROGRAMA ---

    function cambiarVista(vistaActiva) {
        // Ocultar todas las vistas y desactivar todos los botones
        publicView.classList.add('hidden');
        gestorView.classList.add('hidden');
        customGroupsView.classList.add('hidden');
        programaView.classList.add('hidden');
        techView.classList.add('hidden');
        navPublicBtn.classList.remove('active');
        navGestorBtn.classList.remove('active');
        navProgramaBtn.classList.remove('active');
        navCustomGroupsBtn.classList.remove('active');
        navTechBtn.classList.remove('active');

        if (vistaActiva === 'gestor') {
            gestorView.classList.remove('hidden');
            navGestorBtn.classList.add('active');
        } else if (vistaActiva === 'programa') {
            programaView.classList.remove('hidden');
            navProgramaBtn.classList.add('active');
        } else if (vistaActiva === 'custom-groups') {
            customGroupsView.classList.remove('hidden');
            navCustomGroupsBtn.classList.add('active');
        } else if (vistaActiva === 'tech') {
            techView.classList.remove('hidden');
            navTechBtn.classList.add('active');
        } else { // Por defecto, la vista pública
            publicView.classList.remove('hidden');
            navPublicBtn.classList.add('active');
        }
    }

    navPublicBtn.addEventListener('click', () => cambiarVista('public'));
    navGestorBtn.addEventListener('click', () => cambiarVista('gestor'));
    navProgramaBtn.addEventListener('click', () => cambiarVista('programa'));
    navCustomGroupsBtn.addEventListener('click', () => cambiarVista('custom-groups'));
    navTechBtn.addEventListener('click', () => cambiarVista('tech'));

    // Eventos para las pestañas de la vista de tecnología
    techProgramsTabBtn.addEventListener('click', () => {
        techProgramsContent.classList.remove('hidden');
        techTeamContent.classList.add('hidden');
        techProgramsTabBtn.classList.add('active');
        techTeamTabBtn.classList.remove('active');
    });
    techTeamTabBtn.addEventListener('click', () => {
        techProgramsContent.classList.add('hidden');
        techTeamContent.classList.remove('hidden');
        techProgramsTabBtn.classList.remove('active');
        techTeamTabBtn.classList.add('active');
    });

    // Evento para el botón de configuración
    cleaningConfigBtn.addEventListener('click', abrirConfiguracionLimpieza);

    // Eventos para los botones de asignación automática de tecnología
    document.getElementById('auto-assign-ushers-btn').addEventListener('click', autoAssignUshers);
    document.getElementById('auto-assign-av-btn').addEventListener('click', autoAssignAV);

    // Eventos para exportar y compartir programas técnicos
    document.getElementById('export-tech-pdf-btn').addEventListener('click', exportarProgramasTecnicosAPDF);
    document.getElementById('share-tech-html-btn').addEventListener('click', exportarProgramasTecnicosAHTML);


    // Evento para asignar personas en las tablas de Audio/Video
    techView.addEventListener('click', async (e) => {
        if (e.target.matches('td[contenteditable="true"], .asignable[contenteditable="true"]')) {
            const cell = e.target;
            const headerCell = cell.closest('tr').parentElement.previousElementSibling.querySelectorAll('th')[cell.closest('td').cellIndex];
            const headerText = headerCell.textContent.toLowerCase();

            // No abrir el selector para la columna de fecha
            if (headerText === 'fecha') {
                return;
            }

            const allTechMembers = Object.values(techTeam).flat();
            if (allTechMembers.length === 0) {
                Swal.fire('Equipo Vacío', 'Primero añade miembros en la sección "Equipo Técnico".', 'info');
                return;
            }

            // Mapeo de columnas a grupos del equipo técnico
            const groupMapping = {
                'auditorio': 'auditorio',
                'entrada': 'entrada',
                'estacionamiento': 'estacionamiento',
                'cámaras': 'camaras',
                'video': 'video',
                'audio': 'audio',
                'micrófonos (2)': 'microfonos',
                'plataforma': 'plataforma'
            };
            const suggestedGroupKey = groupMapping[headerText];

            const inputOptions = document.createElement('select');
            inputOptions.innerHTML = '<option value="empty">--- Vaciar Celda ---</option>';
            
            // Crear y añadir los grupos de opciones, priorizando el sugerido
            const groupKeys = Object.keys(techTeam);
            if (suggestedGroupKey && groupKeys.includes(suggestedGroupKey)) {
                // Añadir el grupo sugerido primero
                const optgroup = document.createElement('optgroup');
                optgroup.label = (suggestedGroupKey.charAt(0).toUpperCase() + suggestedGroupKey.slice(1).replace(/([A-Z])/g, ' $1').trim()) + " (Sugerido)";
                techTeam[suggestedGroupKey].forEach(name => optgroup.innerHTML += `<option value="${name}">${name}</option>`);
                inputOptions.appendChild(optgroup);
            }
            // Añadir el resto de los grupos
            groupKeys.filter(group => group !== suggestedGroupKey).forEach(group => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = group.charAt(0).toUpperCase() + group.slice(1).replace(/([A-Z])/g, ' $1').trim();
                techTeam[group].forEach(name => optgroup.innerHTML += `<option value="${name}">${name}</option>`);
                inputOptions.appendChild(optgroup);
            });

            const { value: selection } = await Swal.fire({
                title: 'Asignar Miembro',
                html: inputOptions,
                inputValue: cell.textContent,
                showCancelButton: true,
                preConfirm: () => {
                    const select = Swal.getHtmlContainer().querySelector('select');
                    return select.value;
                }
            });

            if (selection !== undefined) {
                if (selection === 'empty') {
                    cell.textContent = '';
                } else {
                    cell.textContent = selection;
                }
                cargarDatos().then(d => guardarDatos(d));
            }
        }
    });

    // Eventos para añadir filas en la vista de Audio/Video
    document.getElementById('add-usher-row-btn').addEventListener('click', () => {
        techUshersProgram.push({});
        renderTechTables();
    });
    document.getElementById('add-av-row-btn').addEventListener('click', () => {
        techAVProgram.push({});
        renderTechTables();
    });

    // Eventos para los botones de añadir item en "Seamos Mejores Maestros"
    document.querySelectorAll('.add-maestros-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            crearFilaMaestros(parseInt(btn.dataset.tableTarget, 10));
        });
    });

    // Eventos para los botones de añadir item en "Nuestra Vida Cristiana"
    document.querySelectorAll('.add-vida-cristiana-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            crearFilaVidaCristiana(parseInt(btn.dataset.tableTarget, 10));
        });
    });

    // Evento para el botón de auto-asignación
    autoAssignBtn.addEventListener('click', autoAsignarPrograma);

    // Evento para el botón de limpiar programa
    clearProgramBtn.addEventListener('click', () => limpiarPrograma(true));

    // Evento para el botón de exportar a PDF
    exportPdfBtn.addEventListener('click', exportarProgramaAPDF);

    // Evento para el botón de compartir como HTML
    shareHtmlBtn.addEventListener('click', exportarProgramaAHTML);

    // Evento para asignar personas en la tabla del programa
    document.getElementById('programa-view').addEventListener('click', async (event) => {
        const target = event.target;

        if (!editMode && target.classList.contains('asignable')) {
            Swal.fire('Modo de solo lectura', 'Inicia sesión para asignar personas.', 'info');
            return;
        }

        if (target.classList.contains('asignable')) {
            const todosLosNombres = obtenerTodosLosNombres();
            if (todosLosNombres.length === 0) {
                Swal.fire('No hay personas', 'Primero añade personas en el "Gestor de Grupos".', 'warning');
                return;
            }

            const inputOptions = { 'empty': '--- Vaciar Asignación ---' };
            todosLosNombres.forEach(nombre => {
                inputOptions[nombre] = nombre;
            });

            const { value: seleccion } = await Swal.fire({
                title: 'Asignar persona',
                input: 'select',
                inputOptions: inputOptions,
                inputPlaceholder: 'Selecciona un nombre',
                showCancelButton: true,
                inputValue: target.textContent.startsWith('[') ? '' : target.textContent
            });

            if (seleccion) {
                if (seleccion === 'empty') {
                    target.textContent = '[ Asignar ]';
                    target.style.fontStyle = 'italic';
                } else {
                    target.textContent = seleccion;
                    target.style.fontStyle = 'normal';
                }
                cargarDatos().then(d => guardarDatos(d));
            }
        }
    });

    // Evento para guardar los títulos de las semanas al editarlos
    document.querySelectorAll('.editable-title').forEach(title => {
        title.addEventListener('blur', () => {
            cargarDatos().then(d => guardarDatos(d));
        });
    });

    // Evento para guardar los títulos de los discursos al editarlos
    document.querySelectorAll('[data-title-part="discurso_10min"]').forEach(title => {
        title.setAttribute('contenteditable', 'true');
        title.addEventListener('blur', async () => { const d = await cargarDatos(); guardarDatos(d); });
    });

    // Evento para guardar la canción inicial
    document.querySelectorAll('input[data-part="cancion_inicial_num"]').forEach(input => {
        input.addEventListener('change', async () => { const d = await cargarDatos(); guardarDatos(d); });
    });
    document.querySelectorAll('span[data-title-part="cancion_inicial"]').forEach(span => {
        span.addEventListener('blur', async () => { const d = await cargarDatos(); guardarDatos(d); });
    });

    // Evento para los checkboxes de Asamblea
    document.querySelectorAll('.assembly-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const weekId = checkbox.dataset.weekId;
            const weekDiv = document.querySelector(`.program-week:has([data-week-id="${weekId}"])`);
            weekDiv.classList.toggle('assembly-week');
            cargarDatos().then(d => guardarDatos(d));
        });
    });

    // --- LÓGICA DE AUTENTICACIÓN ---
    loginBtn.addEventListener('click', async () => {
        if (!editMode) {
            // Iniciar sesión
            const { value: dni } = await Swal.fire({
                title: 'Iniciar Sesión',
                input: 'text',
                inputLabel: 'Introduce tu DNI para editar',
                inputPlaceholder: 'Ej: 12345678A',
                showCancelButton: true,
                confirmButtonText: 'Entrar',
                cancelButtonText: 'Cancelar',
                inputValidator: (value) => {
                    if (!value) {
                        return '¡Necesitas escribir un DNI!';
                    }
                }
            });

            if (dni && validDNIs.includes(dni.toUpperCase())) {
                setEditMode(true);
                userGreeting.textContent = 'Modo Edición';
                userGreeting.classList.remove('hidden');
                loginBtn.textContent = 'Cerrar Sesión';
                Swal.fire('¡Bienvenido!', 'Has iniciado sesión y puedes editar el programa.', 'success');
            } else if (dni) {
                Swal.fire('Acceso denegado', 'El DNI no es correcto.', 'error');
            }
        } else {
            // Cerrar sesión
            setEditMode(false);
            userGreeting.classList.add('hidden');
            loginBtn.textContent = 'Iniciar Sesión para Editar';
            Swal.fire('Sesión cerrada', 'Has vuelto al modo de solo lectura.', 'info');
        }
    });


    function inicializarFilasPorDefecto(table, index) {
        if (table.querySelectorAll('.maestros-row').length === 0) {
            crearFilaMaestros(index + 1, 'Empiece conversaciones (3min)');
            crearFilaMaestros(index + 1, 'Empiece conversaciones (2min)');
            crearFilaMaestros(index + 1, 'Haga Revisitas (2min)');
            crearFilaMaestros(index + 1, 'Haga Revisitas (3min)');
            crearFilaMaestros(index + 1, 'Curso Bíblico (4min)');
            crearFilaMaestros(index + 1, 'Explique sus creencias (5min)');
            crearFilaMaestros(index + 1, 'Discurso (5min)');
        }
        if (table.querySelectorAll('.vida-cristiana-row').length === 0) {
            crearFilaVidaCristiana(index + 1, 'Canción');
            crearFilaVidaCristiana(index + 1, 'Necesidades de la congregación');
            crearFilaVidaCristiana(index + 1, 'X Tema...');
            crearFilaVidaCristiana(index + 1, 'Estudio bíblico de la congregación');
            crearFilaVidaCristiana(index + 1, 'Canción'); // Canción final
        }
    }

    // --- 5. INICIALIZACIÓN ---
    // Migrar datos antiguos si es necesario, antes de cargar todo
    // Cargar los datos guardados al iniciar la aplicación
    cargarDatos().then(() => {

    // Renderizar la vista pública al cargar
    renderPublicView();

    // Renderizar la vista de gestión de grupos personalizados (para que esté lista)
    renderCustomGroupsManagement();

    // Renderizar la lista del equipo técnico (para que esté lista)
    renderTechTeamLists();

    // Renderizar las tablas de tecnología (y poblarlas si están vacías)
    if (techUshersProgram.length === 0 && techAVProgram.length === 0) {
        for (let i = 0; i < 8; i++) {
            techUshersProgram.push({});
            techAVProgram.push({});
        }
    }
    renderTechTables();

    // Renderizar el aviso de limpieza
    renderCleaningNotice();

    // Iniciar en modo de solo lectura por defecto
    setEditMode(false);

    // Si no hay datos guardados, crear las filas por defecto para cada tabla
    programaTables.forEach((table, index) => {
        inicializarFilasPorDefecto(table, index);
    });
    });
});
