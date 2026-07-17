import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCmw7fZ7snWQG29Zimv-4En0No9_0sFSZE",
    authDomain: "motta-card-album.firebaseapp.com",
    projectId: "motta-card-album",
    storageBucket: "motta-card-album.firebasestorage.app",
    messagingSenderId: "362341838103",
    appId: "1:362341838103:web:edfe211f87c46188be9b52"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const albumContainer = document.querySelector('.album');
const menuContainer = document.querySelector('.menu');
const createNewAlbumButton = document.querySelector('.createNewAlbumButton');
const authModal = document.getElementById('authModal');
const mainContent = document.getElementById('mainContent');
const authForm = document.getElementById('authForm');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const authTitle = document.getElementById('authTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');
const deletePageButton = document.getElementById('deletePageButton');
const savePageButton = document.getElementById('savePageButton');
const pageNameInput = document.getElementById('pageNameInput');
const pageNameDisplay = document.getElementById('pageNameDisplay');
const pageLoading = document.getElementById('pageLoading');

let paginasAlbum = {};
const imageLightbox = document.getElementById('imageLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxOverlay = document.getElementById('lightboxOverlay');
let todasAsImagens = [];
let indiceImagemAtual = 0;
let paginaAtual = 1;
let contadorPaginas = 1;
let cardArrastado = null;
let usuarioLogadoId = null;
let modoCadastro = false;
let carregandoDaNuvem = false;
let nomesPaginas = {};

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioLogadoId = user.uid;
        if (authModal) authModal.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        carregarAlbumDaNuvem();
    } else {
        usuarioLogadoId = null;
        if (authModal) authModal.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
        if (albumContainer) {
            albumContainer.innerHTML = '';
        }
        paginasAlbum = {};
    }
});

if (toggleAuthMode) {
    toggleAuthMode.addEventListener('click', () => {
        modoCadastro = !modoCadastro;
        if (modoCadastro) {
            if (authTitle) authTitle.textContent = "Criar Nova Conta";
            if (authSubmitBtn) authSubmitBtn.textContent = "Cadastrar";
            if (toggleAuthMode) toggleAuthMode.textContent = "Fazer Login";
        } else {
            if (authTitle) authTitle.textContent = "Fazer Login";
            if (authSubmitBtn) authSubmitBtn.textContent = "Entrar";
            if (toggleAuthMode) toggleAuthMode.textContent = "Cadastre-se";
        }
    });
}

if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const email = emailInput ? emailInput.value : '';
        const password = passwordInput ? passwordInput.value : '';

        try {
            if (modoCadastro) {
                await createUserWithEmailAndPassword(auth, email, password);
                alert("Conta criada e conectada com sucesso!");
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            alert("Erro na autenticação: " + error.message);
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}

if (savePageButton) {
    savePageButton.addEventListener('click', async () => {
        if (savePageButton.classList.contains('saving')) return;

        savePageButton.classList.add('saving');
        savePageButton.textContent = 'Salvando';

        await salvarAlbumNaNuvem();

        savePageButton.classList.remove('saving');
        savePageButton.textContent = 'Salvar';
    });
}

if (pageNameInput) {
    pageNameInput.addEventListener('input', (e) => {
        nomesPaginas[String(paginaAtual)] = e.target.value;
        if (pageNameDisplay) {
            pageNameDisplay.textContent = e.target.value || 'Nome da página';
        }
    });
}

function criarSlotsVazios() {
    const slots = [];
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.classList.add('album-slot');
        slots.push(slot);
    }
    return slots;
}

function garantirOitoSlots(slots) {
    const resultado = Array.from(slots);
    while (resultado.length < 8) {
        const slot = document.createElement('div');
        slot.classList.add('album-slot');
        resultado.push(slot);
    }
    return resultado;
}

function inicializarPaginas() {
    const slotsIniciais = Array.from(document.querySelectorAll('.album-slot'));
    paginasAlbum['1'] = garantirOitoSlots(slotsIniciais.length ? slotsIniciais : criarSlotsVazios());
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarPaginas();
    const botaoUmInicial = document.querySelector('.page-nav-button[data-page="1"]');
    if (botaoUmInicial) {
        botaoUmInicial.addEventListener('click', () => switchAlbumPage('1'));
    }
    if (deletePageButton) {
        deletePageButton.addEventListener('click', deleteCurrentPage);
    }
    configurarDragAndDrop();
    atualizarBotaoAtivo();
});

if (uploadArea && imageInput) {
    uploadArea.addEventListener('click', () => imageInput.click());
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
            e.target.value = '';
        }
    });
}

function handleFiles(files) {
    const slotsVazios = Array.from(document.querySelectorAll('.album-slot')).filter(slot => slot.children.length === 0);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (i >= slotsVazios.length) {
            alert('Não há mais vagas nesta página! Crie uma nova página.');
            break;
        }

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            const slotAtual = slotsVazios[i];

            reader.onload = (e) => {
                comprimirImagem(e.target.result, 800, 0.7, (base64Comprimido) => {
                    const card = document.createElement('div');
                    card.classList.add('album-item');
                    card.draggable = true;

                    const img = document.createElement('img');
                    img.src = base64Comprimido;
                    img.alt = file.name;
                    card.appendChild(img);

                    const deleteButton = document.createElement('button');
                    deleteButton.classList.add('delete-button');
                    deleteButton.textContent = '×';
                    deleteButton.addEventListener('click', () => {
                        card.remove();
                        salvarAlbumNaNuvem();
                    });

                    card.appendChild(deleteButton);
                    slotAtual.appendChild(card);
                    atualizarEventosDrag(card);
                    
                    salvarAlbumNaNuvem();
                });
            };
            reader.readAsDataURL(file);
        }
    }
}

function comprimirImagem(base64Original, maxDimensao, qualidade, callback) {
    const img = new Image();
    img.src = base64Original;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimensao) {
            height *= maxDimensao / width; width = maxDimensao;
        } else if (height > maxDimensao) {
            width *= maxDimensao / height; height = maxDimensao;
        }

        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', qualidade));
    };
}

function atualizarEventosDrag(card) {
    card.addEventListener('dragstart', () => {
        cardArrastado = card;
        setTimeout(() => card.classList.add('dragging'), 0);
    });
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        cardArrastado = null;
    });
    
    const img = card.querySelector('img');
    if (img) {
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirLightbox(img.src);
        });
        img.style.cursor = 'pointer';
    }
}

function configurarDragAndDrop() {
    const slots = document.querySelectorAll('.album-slot');
    slots.forEach(slot => {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (cardArrastado) slot.classList.add('slot-hover');
        });
        slot.addEventListener('dragleave', () => slot.classList.remove('slot-hover'));
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('slot-hover');
            if (!cardArrastado) return;

            const slotOrigem = cardArrastado.parentElement;
            if (slot.children.length > 0) {
                const cardDestino = slot.querySelector('.album-item');
                slotOrigem.appendChild(cardDestino);
                slot.appendChild(cardArrastado);
            } else {
                slot.appendChild(cardArrastado);
            }
            salvarAlbumNaNuvem();
        });
    });
}

function createNewAlbumPage() {
    salvarPaginaAtual();
    contadorPaginas++;

    const novosSlots = [];
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.classList.add('album-slot');
        novosSlots.push(slot);
    }
    paginasAlbum[String(contadorPaginas)] = novosSlots;

    const pageButton = document.createElement('button');
    pageButton.classList.add('page-nav-button');
    pageButton.textContent = contadorPaginas;
    pageButton.dataset.page = String(contadorPaginas);
    pageButton.addEventListener('click', () => switchAlbumPage(pageButton.dataset.page));

    if (menuContainer && createNewAlbumButton) {
        menuContainer.insertBefore(pageButton, createNewAlbumButton);
    }

    switchAlbumPage(String(contadorPaginas));
    salvarAlbumNaNuvem();
}

function salvarPaginaAtual() {
    if (albumContainer) {
        const children = Array.from(albumContainer.children);
        console.log("Salvando página atual:", paginaAtual, "com", children.length, "elementos");
        console.log("Conteúdo dos children:", children.map(child => {
            const img = child.querySelector('img');
            return img ? 'tem imagem' : 'vazio';
        }));
        paginasAlbum[String(paginaAtual)] = children;
    }
}

function switchAlbumPage(numeroDaPaginaAlvo) {
    if (!carregandoDaNuvem) {
        console.log("Conteúdo do albumContainer antes de salvar:", albumContainer.children);
        salvarPaginaAtual();
    }
    paginaAtual = numeroDaPaginaAlvo;

    const pageNumberTitle = document.querySelector('.page-Number');
    if (pageNumberTitle) {
        pageNumberTitle.textContent = `Página ${parseInt(numeroDaPaginaAlvo)}`;
    }

    albumContainer.innerHTML = '';
    
    const slotsSalvos = paginasAlbum[numeroDaPaginaAlvo] || [];
    
    requestAnimationFrame(() => {
        slotsSalvos.forEach(slot => albumContainer.appendChild(slot));

        if (deletePageButton) {
            deletePageButton.style.display = (numeroDaPaginaAlvo === '1') ? 'none' : 'block';
        }

        if (savePageButton) {
            savePageButton.style.display = 'block';
        }

        if (pageNameInput) {
            pageNameInput.value = nomesPaginas[numeroDaPaginaAlvo] || '';
        }

        if (pageNameDisplay) {
            pageNameDisplay.textContent = nomesPaginas[numeroDaPaginaAlvo] || 'Nome da página';
        }

        configurarDragAndDrop();
        atualizarBotaoAtivo();
    });
}

function deleteCurrentPage() {
    if (paginaAtual === '1' && Object.keys(paginasAlbum).length === 1) return;
    if (!confirm(`Tem certeza que deseja deletar a Página ${paginaAtual}?`)) return;

    delete paginasAlbum[paginaAtual];

    const chavesRestantes = Object.keys(paginasAlbum).sort((a, b) => parseInt(a) - parseInt(b));
    const novaMemoriaAlbum = {};
    chavesRestantes.forEach((antigoNumero, index) => {
        novaMemoriaAlbum[String(index + 1)] = paginasAlbum[antigoNumero];
    });
    paginasAlbum = novaMemoriaAlbum;
    contadorPaginas = chavesRestantes.length;

    const botoesMenu = document.querySelectorAll('.page-nav-button');
    botoesMenu.forEach(btn => btn.remove());

    for (let i = 1; i <= contadorPaginas; i++) {
        const pageButton = document.createElement('button');
        pageButton.classList.add('page-nav-button');
        pageButton.textContent = i;
        pageButton.dataset.page = String(i);
        pageButton.addEventListener('click', () => switchAlbumPage(pageButton.dataset.page));
        menuContainer.insertBefore(pageButton, createNewAlbumButton);
    }

    let paginaAlvo = parseInt(paginaAtual) > contadorPaginas ? String(contadorPaginas) : paginaAtual;
    paginaAtual = paginaAlvo;
    
    albumContainer.innerHTML = '';
    const slotsSalvos = paginasAlbum[paginaAtual] || [];
    slotsSalvos.forEach(slot => albumContainer.appendChild(slot));

    const pageNumberTitle = document.querySelector('.page-Number');
    if (pageNumberTitle) {
        pageNumberTitle.textContent = `Página ${parseInt(paginaAtual)}`;
    }

    configurarDragAndDrop();
    atualizarBotaoAtivo();
    salvarAlbumNaNuvem();
}

function atualizarBotaoAtivo() {
    const botoes = document.querySelectorAll('.page-nav-button');
    botoes.forEach(btn => {
        if (btn.dataset.page === paginaAtual) {
            btn.classList.add('active-page');
        } else {
            btn.classList.remove('active-page');
        }
    });
}

createNewAlbumButton.addEventListener('click', createNewAlbumPage);

async function salvarAlbumNaNuvem() {
    if (!usuarioLogadoId) return;
    salvarPaginaAtual();

    const dadosParaSalvar = {};
    Object.keys(paginasAlbum).forEach(numeroPagina => {
        dadosParaSalvar[String(numeroPagina)] = paginasAlbum[numeroPagina].map(slot => {
            const img = slot.querySelector('img');
            return img ? img.src : null;
        });
    });

    try {
        await setDoc(doc(db, "usuarios_albuns", usuarioLogadoId), {
            estrutura: dadosParaSalvar,
            contadorPaginas: contadorPaginas,
            nomesPaginas: nomesPaginas
        });
        console.log("Álbum sincronizado na nuvem!", dadosParaSalvar);
    } catch (error) {
        console.error("Erro ao salvar álbum:", error);
    }
}

function contarImagensEstrutura(estrutura) {
    let contador = 0;
    Object.values(estrutura || {}).forEach(pagina => {
        pagina.forEach(url => {
            if (url) contador++;
        });
    });
    return contador;
}

function existeImagemLocal() {
    return Array.from(document.querySelectorAll('.album-slot')).some(slot => slot.querySelector('img'));
}

function renderizarBotoesDePagina() {
    const botoesMenu = document.querySelectorAll('.page-nav-button');
    botoesMenu.forEach(btn => btn.remove());

    for (let i = 1; i <= contadorPaginas; i++) {
        const pageButton = document.createElement('button');
        pageButton.classList.add('page-nav-button');
        pageButton.textContent = i;
        pageButton.dataset.page = String(i);
        pageButton.addEventListener('click', () => switchAlbumPage(String(i)));
        menuContainer.insertBefore(pageButton, createNewAlbumButton);
    }
}

async function carregarAlbumDaNuvem() {
    if (!usuarioLogadoId) return;
    carregandoDaNuvem = true;

    if (pageLoading) pageLoading.style.display = 'flex';

    const botoesAntigos = document.querySelectorAll('.page-nav-button');
    botoesAntigos.forEach(btn => btn.remove());

    try {
        const docSnap = await getDoc(doc(db, "usuarios_albuns", usuarioLogadoId));
        
        if (docSnap.exists()) {
            const dados = docSnap.data();
            contadorPaginas = dados.contadorPaginas || 1;
            const estruturaNuvem = dados.estrutura;
            nomesPaginas = dados.nomesPaginas || {};

            console.log("Carregando dados da nuvem:", dados);
            console.log("Contador de páginas:", contadorPaginas);
            console.log("Estrutura da nuvem:", estruturaNuvem);
            console.log("Nomes das páginas:", nomesPaginas);

            paginasAlbum = {};
            Object.keys(estruturaNuvem).forEach(numeroPagina => {
                console.log("Carregando página:", numeroPagina, "com dados:", estruturaNuvem[numeroPagina]);
                const dadosPagina = estruturaNuvem[numeroPagina];
                
                if (!dadosPagina || !Array.isArray(dadosPagina) || dadosPagina.length === 0) {
                    console.log("Página vazia ou inválida, criando 8 slots vazios");
                    paginasAlbum[numeroPagina] = criarSlotsVazios();
                    return;
                }
                
                paginasAlbum[numeroPagina] = dadosPagina.map(url => {
                    const slot = document.createElement('div');
                    slot.classList.add('album-slot');

                    if (url) {
                        const card = document.createElement('div');
                        card.classList.add('album-item');
                        card.draggable = true;

                        const img = document.createElement('img');
                        img.src = url;
                        card.appendChild(img);

                        const deleteButton = document.createElement('button');
                        deleteButton.classList.add('delete-button');
                        deleteButton.textContent = '×';
                        deleteButton.addEventListener('click', () => {
                            card.remove();
                            salvarAlbumNaNuvem();
                        });
                        card.appendChild(deleteButton);
                        slot.appendChild(card);
                        atualizarEventosDrag(card);
                    }
                    return slot;
                });
            });

            console.log("Páginas carregadas:", Object.keys(paginasAlbum));

            for (let i = 1; i <= contadorPaginas; i++) {
                const pageButton = document.createElement('button');
                pageButton.classList.add('page-nav-button');
                pageButton.textContent = i;
                pageButton.dataset.page = String(i);
                pageButton.addEventListener('click', () => switchAlbumPage(String(i)));
                menuContainer.insertBefore(pageButton, createNewAlbumButton);
            }

            switchAlbumPage('1');
            atualizarBotaoAtivo();
        } 
        else {
            contadorPaginas = 1;
            paginasAlbum = {};
            
            const slotsIniciais = [];
            for (let i = 0; i < 8; i++) {
                const slot = document.createElement('div');
                slot.classList.add('album-slot');
                slotsIniciais.push(slot);
            }
            paginasAlbum['1'] = slotsIniciais;
            
            const pageButton = document.createElement('button');
            pageButton.classList.add('page-nav-button');
            pageButton.textContent = "1";
            pageButton.dataset.page = "1";
            pageButton.addEventListener('click', () => switchAlbumPage('1'));
            menuContainer.insertBefore(pageButton, createNewAlbumButton);

            switchAlbumPage('1');
            salvarAlbumNaNuvem();
        }
    } catch (error) {
        console.error("Erro ao carregar álbum:", error);
    } finally {
        carregandoDaNuvem = false;
        if (pageLoading) pageLoading.style.display = 'none';
    }
}

function coletarTodasAsImagens() {
    todasAsImagens = [];
    const imagens = document.querySelectorAll('.album-item img');
    imagens.forEach(img => {
        todasAsImagens.push(img.src);
    });
}

function abrirLightbox(srcImagem) {
    coletarTodasAsImagens();
    indiceImagemAtual = todasAsImagens.indexOf(srcImagem);
    
    if (indiceImagemAtual === -1) {
        indiceImagemAtual = 0;
    }
    
    atualizarLightbox();
    imageLightbox.classList.add('active');
}

function fecharLightbox() {
    imageLightbox.classList.remove('active');
}

function atualizarLightbox() {
    if (todasAsImagens.length === 0) return;
    
    lightboxImage.src = todasAsImagens[indiceImagemAtual];
    lightboxCounter.textContent = `${indiceImagemAtual + 1} / ${todasAsImagens.length}`;
}

function proximaImagem() {
    indiceImagemAtual = (indiceImagemAtual + 1) % todasAsImagens.length;
    atualizarLightbox();
}

function imagemAnterior() {
    indiceImagemAtual = (indiceImagemAtual - 1 + todasAsImagens.length) % todasAsImagens.length;
    atualizarLightbox();
}

if (lightboxClose) {
    lightboxClose.addEventListener('click', fecharLightbox);
}

if (lightboxOverlay) {
    lightboxOverlay.addEventListener('click', fecharLightbox);
}

if (lightboxNext) {
    lightboxNext.addEventListener('click', proximaImagem);
}

if (lightboxPrev) {
    lightboxPrev.addEventListener('click', imagemAnterior);
}

document.addEventListener('keydown', (e) => {
    if (!imageLightbox.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
        fecharLightbox();
    } else if (e.key === 'ArrowRight') {
        proximaImagem();
    } else if (e.key === 'ArrowLeft') {
        imagemAnterior();
    }
});
