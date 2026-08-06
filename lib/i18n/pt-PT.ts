import type { en } from "./en";

// Portuguese (Portugal) translations. Typed as `typeof en` so a missing
// or extra key is a compile-time TypeScript error.
export const ptPT: typeof en = {
  tabsLayout: {
    plants: {
      title: "Plantas",
      addAction: "Adicionar",
      archivedAction: "Arquivadas",
    },
    feed: {
      title: "Feed",
    },
    people: {
      title: "Pessoas",
    },
    plantSitting: {
      title: "Cuidar de Plantas",
      tabLabel: "Cuidar",
    },
    notifications: {
      title: "Alertas",
    },
  },
  index: {
    status: {
      overdue: "em atraso",
      dueSoon: "em breve",
      dueToday: "hoje",
      healthy: "saudável",
    },
    careType: {
      watering: "rega",
      fertilize: "adubar",
      repot: "trocar terra",
    },
    pill: {
      labelStatus: "{label}: {status}",
    },
    error: "Erro: {error}",
    emptyState: "Ainda não há plantas",
    logProgress: "Registar progresso",
  },
  feed: {
    plantLine: {
      sentence: "Registou progresso na planta {plant} de {owner}",
      sentenceNoOwner: "Registou progresso na planta {plant}",
    },
    heightUnit: "{height} cm",
    like: {
      liked: "♥ Gostei",
      unliked: "♡ Gosto",
    },
    comments: {
      off: "Comentários desativados",
      countOne: "{count} comentário",
      countMany: "{count} comentários",
      none: "Ainda sem comentários",
      add: "Adicionar comentário",
    },
    error: "Erro: {error}",
    emptyState: "Ainda sem atividade",
  },
  addPlant: {
    screenTitle: "Adicionar Planta",
    photo: {
      label: "Foto",
      lookupButton: "Identificar com IA",
    },
    name: {
      label: "Nome (opcional)",
      hint: "ex.: Pothos — deixa em branco para a IA identificar pela foto",
    },
    nickname: {
      label: "Alcunha (opcional)",
    },
    species: {
      label: "Espécie",
      placeholder: "ex.: Epipremnum aureum",
    },
    wateringFrequency: {
      label: "Frequência de rega (dias)",
      placeholder: "ex.: 8",
    },
    fertilizeFrequency: {
      label: "Frequência de adubação (dias, opcional)",
      placeholder: "ex.: 30",
    },
    repotFrequency: {
      label: "Frequência de troca de terra (dias, opcional)",
      placeholder: "ex.: 365",
    },
    location: {
      label: "Localização (opcional)",
      placeholder: "ex.: Sala de estar, janela a nascente",
    },
    lightExposure: {
      label: "Exposição à luz (opcional)",
      options: {
        lowLight: "Pouca luz",
        mediumLight: "Luz média",
        brightIndirect: "Luz indireta forte",
        directSun: "Sol direto",
      },
    },
    careDifficulty: {
      label: "Dificuldade de cuidado (opcional)",
      options: {
        beginner: "Iniciante",
        intermediate: "Intermédio",
        advanced: "Avançado",
      },
    },
    toxicToPets: {
      label: "Tóxica para animais de estimação? (opcional)",
    },
    toxicToHumans: {
      label: "Tóxica para humanos? (opcional)",
    },
    toxicity: {
      options: {
        yes: "Sim",
        no: "Não",
        unknown: "Desconhecido",
      },
    },
    acquiredDate: {
      label: "Data de aquisição (opcional)",
    },
    initialHeight: {
      label: "Altura inicial (cm, opcional)",
      placeholder: "ex.: 32",
    },
    saveButton: "Guardar planta",
    lookupError: "Não foi possível identificar esta planta. Tenta novamente.",
    lookupErrorOverloaded: "A IA está com muita carga neste momento. Tenta novamente dentro de alguns minutos.",
    lookupModal: {
      nameMismatch: {
        message: 'A IA identificou isto como "{aiName}", mas introduziste "{typedName}".',
        keepTyped: 'Manter "{typedName}"',
        useAi: 'Usar "{aiName}"',
      },
      ambiguous: {
        message: "Foram encontradas várias correspondências possíveis:",
      },
      notFound: {
        message:
          "Não foi possível identificar uma planta nesta foto. Tira uma nova fotografia, ou fecha esta janela, escreve um nome comum acima e tenta novamente.",
      },
      takeNewPicture: "Tirar nova fotografia",
      cancel: "Cancelar",
    },
  },
  signIn: {
    screenTitle: "Iniciar Sessão",
    appTitle: "Greenie",
    email: {
      label: "Email",
      placeholder: "nome@exemplo.com",
    },
    password: {
      label: "Palavra-passe",
      placeholder: "••••••••",
    },
    submitButton: "Iniciar sessão",
    divider: "ou",
    googleButton: "Continuar com Google",
    createAccountLink: "Criar conta",
  },
  signUp: {
    usernameTakenError: "Nome de utilizador já está em uso",
    checkEmail: {
      screenTitle: "Criar Conta",
      message: "Enviámos um código de confirmação para {email}. Introduz-o abaixo para concluir a criação da tua conta.",
      confirmButton: "Confirmar",
      backToSignInLink: "Voltar ao início de sessão",
    },
    form: {
      screenTitle: "Criar Conta",
      heading: "Criar conta",
      email: {
        label: "Email",
        placeholder: "nome@exemplo.com",
      },
      username: {
        label: "Nome de utilizador",
        placeholder: "ex.: amante.plantas_42",
      },
      password: {
        label: "Palavra-passe (mín. 6 caracteres)",
        placeholder: "••••••••",
      },
      consent: {
        prefix: "Li e concordo com a ",
        privacyLink: "Política de Privacidade",
        middle: " e os ",
        termsLink: "Termos de Utilização",
      },
      submitButton: "Criar conta",
      divider: "ou",
      googleButton: "Continuar com Google",
      signInLink: "Já tens uma conta? Iniciar sessão",
    },
  },
  welcome: {
    loadingScreenTitle: "Bem-vindo",
    errorScreenTitle: "Bem-vindo",
    error: "Erro: {error}",
    reconsent: {
      screenTitle: "Privacidade e Termos",
      heading: "Atualização da Política de Privacidade e dos Termos de Utilização",
      intro: "A política de privacidade e/ou os termos de utilização foram alterados desde a última vez que os aceitaste — revê-os para continuar.",
      submitButton: "Aceitar e continuar",
      signOutLink: "Terminar sessão",
    },
    firstTime: {
      screenTitle: "Bem-vindo",
      heading: "Bem-vindo ao Greenie",
      intro: "Só mais um passo antes de continuar: confirma que está tudo correto e aceita a política de privacidade e os termos de utilização.",
      displayName: {
        label: "Nome apresentado",
        placeholder: "ex.: Carlos",
      },
      username: {
        label: "Nome de utilizador",
        placeholder: "ex.: amante.plantas_42",
        cooldownHint: "Esta primeira alteração é gratuita; depois, o nome de utilizador só pode ser alterado de vez em quando.",
      },
      submitButton: "Continuar",
      signOutLink: "Não és tu? Terminar sessão",
    },
    consent: {
      prefix: "Li e concordo com a ",
      privacyLink: "Política de Privacidade",
      middle: " e os ",
      termsLink: "Termos de Utilização",
    },
  },
  settings: {
    screenTitle: "Definições",
    appearance: {
      sectionTitle: "Aparência",
      options: {
        system: "Sistema",
        light: "Claro",
        dark: "Escuro",
      },
      hint: "Sistema segue a definição do teu dispositivo.",
    },
    language: {
      sectionTitle: "Idioma",
      options: {
        // Language names stay in their own native form regardless of the
        // chosen UI language -- only "System" (a UI concept, not a
        // language name) follows the current locale.
        system: "Sistema",
        en: "English",
        ptPT: "Português (Portugal)",
      },
      hint: "Sistema segue o idioma do teu dispositivo.",
    },
    feedback: {
      sectionTitle: "Feedback",
      sectionIntro: "Encontraste um problema ou tens uma sugestão? Diz-nos.",
      link: "Enviar feedback",
    },
    changePassword: {
      sectionTitle: "Alterar palavra-passe",
      googleOnlyHint: "Inicias sessão com Google — esta conta não tem palavra-passe.",
      currentPassword: { label: "Palavra-passe atual" },
      newPassword: { label: "Nova palavra-passe (mín. 6 caracteres)" },
      confirmPassword: {
        label: "Confirmar nova palavra-passe",
        mismatchError: "As palavras-passe não coincidem",
      },
      savedText: "Palavra-passe atualizada",
      saveButton: "Guardar",
    },
    emailLinkedAccounts: {
      sectionTitle: "Email e contas associadas",
      googleSyncBanner:
        "Conta Google associada — verifica {email} para o link de confirmação e concluir a alteração do email da conta.",
      currentEmail: "Email atual: {email}",
      newEmail: {
        label: "Novo email",
        placeholder: "nome@exemplo.com",
      },
      codeSent: "Código enviado para {email}",
      confirmationCode: { label: "Código de confirmação" },
      emailChanged: "Verifica {newEmail} para o link de confirmação e concluir a alteração.",
      confirmChangeButton: "Confirmar e alterar email",
      sendCodeButton: "Enviar código para o email atual",
      linkedAccounts: {
        label: "Contas associadas",
        googleLinked: "Conta Google associada ({email}).",
        webOnlyHint: "Por agora, associar uma conta Google só está disponível na versão web.",
        confirmLinkButton: "Confirmar e associar conta Google",
        unlinkButton: "Desassociar",
        confirmUnlink: {
          message: "Desassociar a tua conta Google ({email})? Podes voltar a associá-la quando quiseres.",
          confirmButton: "Desassociar",
        },
      },
    },
    privacy: {
      sectionTitle: "Privacidade",
      readPolicyLink: "Ler a Política de Privacidade",
      blockedUsersLink: "Utilizadores bloqueados",
      profileVisibility: {
        label: "Perfil",
        options: { public: "Público", private: "Privado" },
        hint: "Privado mostra apenas o teu nome, avatar e biografia a quem não te segue.",
      },
      followRequests: {
        label: "Pedidos para seguir",
        options: { open: "Qualquer pessoa pode seguir", request: "Requer aprovação" },
      },
      progressReports: {
        label: "Relatórios de progresso",
        options: { public: "Público", private: "Apenas seguidores" },
      },
      plantSitters: {
        label: "Cuidadores de plantas",
        options: {
          allowed: "Permitir partilha no feed deles",
          disabled: "Manter apenas no histórico da planta",
        },
        hint:
          "Quando um cuidador regista um relatório de progresso numa das tuas plantas, isto controla se pode partilhá-lo no seu próprio feed. Desativado: os relatórios ficam apenas no histórico desta planta.",
      },
      savedText: "Definições de privacidade guardadas",
      saveButton: "Guardar definições de privacidade",
    },
    notifications: {
      sectionTitle: "Notificações",
      push: {
        label: "Notificações push",
        webHint: "As notificações push estão disponíveis na aplicação móvel.",
        options: { on: "Ativado", off: "Desativado" },
        hint:
          "Recebe notificações neste dispositivo. Aplica-se apenas a este dispositivo — desativar não afeta a tua caixa de entrada na aplicação.",
        permissionDeniedError:
          "A permissão de notificações foi recusada — ativa as notificações para o Greenie nas definições do dispositivo e tenta novamente.",
      },
      sectionIntro: "Escolhe o que aparece nas tuas notificações. Tudo o que estiver desativado nunca é criado — não é apenas ocultado.",
      prefRows: {
        careTaskReminders: "Lembretes de tarefas",
        comments: "Comentários",
        likes: "Gostos",
        followRequests: "Pedidos para seguir",
        newFollowers: "Novos seguidores",
        followRequestAccepted: "Pedido para seguir aceite",
        sittingRequests: "Pedidos para cuidar de plantas",
        sittingResponses: "Respostas a pedidos de cuidar de plantas",
      },
      prefOptions: { on: "Ativado", off: "Desativado" },
      savedText: "Definições de notificações guardadas",
      saveButton: "Guardar definições de notificações",
    },
    support: {
      sectionTitle: "Apoiar o Greenie",
      sectionIntro:
        "Se o Greenie te é útil, podes oferecer-me um café — totalmente opcional, é só uma forma de agradecer.",
      button: "Oferecer um café",
      hintModal: {
        title: "Torna-te apoiante",
        intro: "Uma doação desbloqueia um distintivo junto ao teu nome, com base no total doado ao longo do tempo:",
        tierThreshold: "€{amount}+",
        usernameNote:
          "Para te ser atribuído, adiciona o teu @nomedeutilizador ao campo de nome ou mensagem no checkout — é assim que associamos a tua doação à tua conta Greenie.",
        continueButton: "Continuar para o Buy Me a Coffee",
      },
    },
    badges: {
      sectionTitle: "Distintivos",
      sectionIntro: "Toca num distintivo para o mostrar ou ocultar junto ao teu nome.",
      saveButton: "Guardar definições de distintivos",
      savedText: "Definições de distintivos guardadas",
    },
    yourData: {
      sectionTitle: "Os teus dados",
      sectionIntro:
        "Tudo o que o Greenie guarda sobre ti — a tua conta, plantas, calendários de cuidados, relatórios de progresso, comentários, gostos e seguidores — num ficheiro JSON. Transfere-o para este dispositivo, ou recebe uma cópia no email associado à tua conta.",
      downloadButton: "Transferir os meus dados",
      emailSent: "Enviado — verifique {email}.",
      emailButton: "Enviar-me uma cópia por email",
    },
    dangerZone: {
      sectionTitle: "Zona de perigo",
    },
  },
  common: {
    cancel: "Cancelar",
    save: "Guardar",
    notSet: "Não definido",
    heightUnit: "{height} cm",
    confirmSure: "De certeza?",
    accept: "Aceitar",
    decline: "Recusar",
    unblock: "Desbloquear",
    report: "Denunciar",
    close: "Fechar",
    chipOptions: {
      commentPolicy: {
        anyone: "Todos",
        followersOnly: "Apenas seguidores",
        off: "Desativado",
      },
      feedSharing: {
        shareToFeed: "Partilhar no feed",
        dontShare: "Não partilhar",
      },
    },
  },
  badges: {
    supporterTier: {
      bronze: "Bronze",
      silver: "Prata",
      gold: "Ouro",
      platinum: "Platina",
    },
    betaTester: {
      // Deliberately untranslated -- same treatment as "Greenie" itself.
      // "Testador beta" read as an awkward literal translation per
      // tester feedback; kept as the English brand term in both languages.
      label: "Beta tester",
    },
  },
  plantDetail: {
    headerTitle: "Planta",
    errorPrefix: "Erro: {error}",
    neverDoneDate: "Nunca",
    nickname: {
      label: "Alcunha",
      editLink: "Editar",
    },
    acquiredDate: {
      label: "Data de aquisição",
      editLink: "Editar",
    },
    archived: {
      badge: "Arquivada",
      archiveLink: "Arquivar esta planta",
      confirmMessage:
        "Arquivar esta planta? Será escondida da tua lista de Plantas e os lembretes de cuidados serão pausados. Podes restaurá-la a qualquer momento em Plantas Arquivadas.",
    },
    lightExposure: {
      low_light: "Pouca luz",
      medium_light: "Luz média",
      bright_indirect: "Luz indireta forte",
      direct_sun: "Sol direto",
    },
    careDifficulty: {
      beginner: "Iniciante",
      intermediate: "Intermédio",
      advanced: "Avançado",
    },
    toxicity: {
      toxicToPets: "Tóxica para animais de estimação",
      safeForPets: "Segura para animais de estimação",
      toxicToHumans: "Tóxica para humanos",
      safeForHumans: "Segura para humanos",
    },
    progress: {
      label: "Progresso",
      empty: "Ainda não há progresso registado",
      unlistedTag: "Não listado",
    },
    careTasks: {
      label: "Tarefas de cuidado",
      frequencyOne: "A cada {count} dia",
      frequencyMany: "A cada {count} dias",
      lastDone: "Última vez: {date}",
      nextDue: "Próxima: {date}",
      frequencyPlaceholder: "dias",
      deleteConfirmPrompt: "Eliminar esta tarefa?",
      confirm: "Confirmar",
      overduePrompt: "Esta tarefa está atrasada. Contar a próxima data a partir de:",
      originalDueDate: "Data de vencimento original",
      today: "Hoje",
      markDone: "Marcar como feita",
      edit: "Editar",
      delete: "Eliminar",
      addTask: "+ Adicionar tarefa",
    },
  },
  progress: {
    headerTitle: "Progresso",
    errorPrefix: "Erro: {error}",
    setAsPlantPhoto: "Definir como foto da planta",
    ownerSettings: {
      commentsLabel: "Comentários",
      feedLabel: "Feed",
      sitterShareBlockedHint:
        "O dono desta planta mantém os relatórios de cuidadores fora dos feeds — isto fica apenas no histórico da própria planta.",
      unlistedLockHint: "Este relatório não está listado e não pode voltar a ser partilhado; os comentários mantêm-se desativados.",
    },
    commentsOffNotice: "Os comentários estão desativados nesta publicação",
    commentInputPlaceholder: "Adicionar um comentário",
    postButton: "Publicar",
    followersOnlyNotice: "Só os seguidores podem comentar isto",
  },
  logProgress: {
    headerTitle: "Registar Progresso",
    photo: {
      label: "Foto (opcional)",
      chipJustReport: "Apenas este relatório",
      chipAlsoSetPlantPhoto: "Também definir como foto da planta",
    },
    height: {
      label: "Altura (cm, opcional)",
    },
    notes: {
      label: "Notas",
      placeholder: "O que há de novo com esta planta?",
    },
    comments: {
      label: "Comentários",
    },
    feed: {
      label: "Feed",
      unlistedWarning:
        "Não aparecerá no feed de ninguém, e os comentários ficarão desativados — isto não pode ser desfeito depois de guardado.",
      sitterShareBlockedHint:
        "O dono desta planta mantém os relatórios de cuidadores fora dos feeds — isto só aparecerá no histórico da própria planta.",
    },
  },
  likes: {
    fallbackName: "Alguém",
    headerTitle: "Gostos de",
    empty: "Ainda sem gostos",
    errorPrefix: "Erro: {error}",
  },
  report: {
    screenTitle: "Denunciar",
    reasonLabel: "Porque estás a denunciar isto?",
    reasons: {
      spam: "Spam",
      harassment: "Assédio ou bullying",
      inappropriate_content: "Conteúdo impróprio",
      other: "Outro",
    },
    detailsLabel: "Detalhes adicionais (opcional)",
    detailsPlaceholder: "Mais alguma coisa que devêssemos saber?",
    alsoBlock: "Bloquear também esta conta",
    submitButton: "Enviar denúncia",
    successMessage: "Obrigado — vamos analisar esta denúncia.",
    blockFailed: "Denúncia enviada, mas não foi possível bloquear esta conta: {error}",
    doneButton: "Concluído",
  },
  feedback: {
    screenTitle: "Enviar Feedback",
    typeLabel: "Sobre o que é isto?",
    types: {
      suggestion: "Sugestão",
      bug: "Reportar um problema",
      feedback: "Feedback",
      other: "Outro",
    },
    descriptionLabel: "Descrição",
    descriptionPlaceholder: "Diz-nos o que pensas. Para um problema, inclui os passos para o reproduzir, se possível.",
    photosLabel: "Fotografias (opcional)",
    addPhotoButton: "Adicionar fotografia",
    photoLimitHint: "Até {max} fotografias",
    removePhoto: "Remover fotografia",
    submitButton: "Enviar",
    submitAnotherButton: "Enviar outro",
    doneButton: "Concluído",
    successMessage: "Obrigado pelo teu feedback!",
    rateLimitError: "Aguarda um minuto antes de enviar novamente.",
  },
  heightChart: {
    captionEntry: "{date} · {height} cm",
  },
  datePickerField: {
    defaultPlaceholder: "Selecionar data",
    backToCalendar: "‹ Voltar ao calendário",
    clearDate: "Limpar data",
    monthNames: {
      january: "Janeiro",
      february: "Fevereiro",
      march: "Março",
      april: "Abril",
      may: "Maio",
      june: "Junho",
      july: "Julho",
      august: "Agosto",
      september: "Setembro",
      october: "Outubro",
      november: "Novembro",
      december: "Dezembro",
    },
    monthAbbrev: {
      jan: "Jan",
      feb: "Fev",
      mar: "Mar",
      apr: "Abr",
      may: "Mai",
      jun: "Jun",
      jul: "Jul",
      aug: "Ago",
      sep: "Set",
      oct: "Out",
      nov: "Nov",
      dec: "Dez",
    },
  },
  photoPicker: {
    takePhoto: "Tirar Foto",
    chooseFromLibrary: "Escolher da Biblioteca",
  },
  following: {
    screenTitle: "A seguir",
    headerActions: {
      requests: "Pedidos",
      followers: "Seguidores",
      add: "Adicionar",
    },
    error: "Erro: {error}",
    emptyState: "Ainda não segues ninguém",
    noMatch: 'Ninguém que segues corresponde a "{query}"',
    searchPlaceholder: "pessoas que segues",
  },
  followers: {
    screenTitle: "Seguidores",
    error: "Erro: {error}",
    emptyState: "Ainda sem seguidores",
    row: {
      remove: "Remover",
    },
    confirmRemove: {
      message: "Remover {name} como seguidor?",
    },
  },
  followRequests: {
    screenTitle: "Pedidos para Seguir",
    error: "Erro: {error}",
    emptyState: "Sem pedidos pendentes",
    followBack: "Seguir de volta",
    requestedLabel: "Pedido",
  },
  searchUsers: {
    screenTitle: "Pesquisar Utilizadores",
    placeholder: "utilizadores por nome ou nome de utilizador",
    error: "Erro: {error}",
    promptState: "Escreve um nome ou nome de utilizador para pesquisar",
    emptyState: "Nenhum utilizador encontrado",
    addButton: {
      add: "Adicionar",
      following: "A seguir",
    },
  },
  blockedUsers: {
    screenTitle: "Utilizadores Bloqueados",
    error: "Erro: {error}",
    emptyState: "Sem utilizadores bloqueados",
  },
  archivedPlants: {
    screenTitle: "Plantas Arquivadas",
    error: "Erro: {error}",
    emptyState: "Sem plantas arquivadas",
    row: {
      restore: "Restaurar",
      delete: "Eliminar",
    },
    confirmDelete: {
      message: "Eliminar permanentemente {name}? Esta ação não pode ser desfeita.",
    },
  },
  userProfile: {
    loadingTitle: "Perfil",
    error: "Erro: {error}",
    noBio: "Ainda sem biografia",
    blockedNotice: "Bloqueaste esta conta.",
    followButton: {
      follow: "Seguir",
      requested: "Pedido",
      unfollow: "Deixar de seguir",
    },
    confirmBlock: {
      message:
        "Bloquear esta conta? Deixará de poder seguir-te ou ver as tuas plantas e relatórios de progresso, e também não verás os da pessoa bloqueada. Podes desbloquear a qualquer momento.",
      confirm: "Bloquear",
    },
    blockLink: "Bloquear esta conta",
    plantsSection: {
      privateNotice: "Esta conta é privada",
    },
    careStreak: "Sequência de {count} dias",
  },
  plantSitting: {
    state: {
      pending: "Pendente",
      upcoming: "Próximo",
      active: "Ativo",
      ended: "Terminado",
      declined: "Recusado",
      cancelled: "Cancelado",
    },
    header: {
      share: "Partilhar",
      request: "Pedir",
    },
    shareDialogTitle: "Instruções de cuidado das plantas",
    shareError: {
      noPlants: "Ainda não tens plantas para partilhar instruções de cuidado.",
    },
    error: "Erro: {error}",
    sectionTitle: {
      requestsForMe: "Pedidos para mim",
      sittingFor: "A cuidar de",
      mySitters: "Os meus cuidadores",
      history: "Histórico de cuidadores",
    },
    emptyState: {
      noRequests: "Sem pedidos pendentes",
      notSittingForAnyone: "De momento não estás a cuidar das plantas de ninguém",
      noSitters: "Ainda não pediste a ninguém para cuidar das tuas plantas",
      noHistory: "Ainda sem histórico de cuidadores",
    },
    sentRequestRow: {
      keep: "Manter",
    },
    confirmCancelRequest: {
      message: "Cancelar o teu pedido de cuidado de plantas a {name}?",
    },
  },
  requestSitting: {
    screenTitle: "Pedir Cuidado de Plantas",
    sitterFallback: "este seguidor",
    intro:
      "Pede a {sitterName} para cuidar de todas as tuas plantas enquanto estás fora. Vai poder ver as tuas tarefas de cuidado, marcá-las como feitas, e registar novos relatórios de progresso em teu nome.",
    streakHint:
      "As tarefas de cuidado que o teu cuidador completar contam para a sequência dele, não para a tua. A tua sequência pausa enquanto ele cuida das tuas plantas, e se falhar alguma tarefa, tem um dia de tolerância para a concluir antes de afetar a sequência dele.",
    startDate: {
      label: "Data de início (opcional)",
    },
    endDate: {
      label: "Data de fim (opcional)",
      rangeError: "A data de fim deve ser igual ou posterior à data de início",
      hint:
        "Deixa ambos em branco para um pedido sem data definida que podes cancelar a qualquer momento. O acesso abre na data de início e fecha após a data de fim -- aceitar mais cedo não antecipa a abertura.",
    },
    sendButton: "Enviar pedido",
  },
  selectSitter: {
    screenTitle: "Escolher um Cuidador",
    error: "Erro: {error}",
    emptyState: "Ainda não tens seguidores mútuos -- para cuidar de plantas é preciso seguirem-se mutuamente.",
  },
  notificationsScreen: {
    error: "Erro: {error}",
    emptyState: "Ainda nada por aqui",
    sentence: {
      comment: "{name} comentou o teu relatório",
      like: "{name} gostou do teu relatório",
      followRequest: "{name} pediu para te seguir",
      newFollower: "{name} começou a seguir-te",
      followAccepted: "{name} aceitou o teu pedido para seguir",
      sittingRequest: "{name} pediu-te para cuidar das plantas",
      sittingAccepted: "{name} aceitou o teu pedido de cuidado de plantas",
      sittingDeclined: "{name} recusou o teu pedido de cuidado de plantas",
      careDueWater: "Hora de regar {plant}",
      careDueFertilize: "Hora de adubar {plant}",
      careDueRepot: "Hora de trocar a terra de {plant}",
      sittingGraceDayWater: "Dia de tolerância concedido: a rega de {plant} foi estendida por 1 dia — conclui-a até amanhã",
      sittingGraceDayFertilize: "Dia de tolerância concedido: a adubação de {plant} foi estendida por 1 dia — conclui-a até amanhã",
      sittingGraceDayRepot: "Dia de tolerância concedido: a troca de terra de {plant} foi estendida por 1 dia — conclui-a até amanhã",
      sittingGraceExpiredWater: "O dia de tolerância para a rega de {plant} terminou — a tua sequência foi reiniciada",
      sittingGraceExpiredFertilize: "O dia de tolerância para a adubação de {plant} terminou — a tua sequência foi reiniciada",
      sittingGraceExpiredRepot: "O dia de tolerância para a troca de terra de {plant} terminou — a tua sequência foi reiniciada",
    },
    plantFallback: "a tua planta",
  },
  careStreakGraceModal: {
    title: "Dia de tolerância",
    messageWater: "Foi-te concedido um dia de tolerância: a tarefa de rega de {plant} foi estendida por 1 dia. Conclui-a até amanhã, ou a tua sequência de cuidados será reiniciada.",
    messageFertilize: "Foi-te concedido um dia de tolerância: a tarefa de adubação de {plant} foi estendida por 1 dia. Conclui-a até amanhã, ou a tua sequência de cuidados será reiniciada.",
    messageRepot: "Foi-te concedido um dia de tolerância: a tarefa de troca de terra de {plant} foi estendida por 1 dia. Conclui-a até amanhã, ou a tua sequência de cuidados será reiniciada.",
    messageMultiple: "Foi-te concedido um dia de tolerância: {count} tarefas de cuidado em atraso foram estendidas por 1 dia. Conclui-as até amanhã, ou a tua sequência de cuidados será reiniciada.",
    dismiss: "Entendi",
  },
  profile: {
    screenTitle: "Perfil",
    error: "Erro: {error}",
    username: {
      cooldownHint: "Podes voltar a alterar o nome de utilizador a {date}",
    },
    careStreak: {
      sectionTitle: "Sequência de cuidados",
      current: "Sequência de {count} dias",
      currentZero: "Marca uma tarefa de cuidado como concluída a tempo para começar uma sequência",
      longest: "Melhor: {count} dias",
    },
    bio: {
      label: "Biografia",
      placeholder: "Fala um pouco sobre ti a outros amantes de plantas",
    },
    savedText: "Guardado",
    confirmUsernameChange: {
      message: "O nome de utilizador só pode ser alterado a cada {days} dias. Alterar para @{username}?",
      confirm: "Alterar nome de utilizador",
    },
    signOutButton: "Terminar sessão",
  },
  deleteAccount: {
    screenTitle: "Eliminar Conta",
    heading: "Eliminar a tua conta",
    intro:
      "Esta página permite eliminar permanentemente a tua conta Greenie e todos os teus dados sem precisar de instalar a aplicação. Inicia sessão para continuar — a eliminação continua a exigir a confirmação de um código enviado para o email da tua conta, tal como ao eliminar dentro da aplicação.",
    deletedMessage:
      "A tua conta foi eliminada. Tudo o que estava associado a ela — o teu perfil, plantas, calendários de cuidados, relatórios de progresso, comentários, gostos e seguidores — foi removido permanentemente.",
  },
  accountDeletionFlow: {
    sectionIntro: {
      base:
        "Eliminar a tua conta remove permanentemente o teu perfil, plantas, calendários de cuidados, relatórios de progresso, comentários, gostos e seguidores. Esta ação não pode ser desfeita.",
      passwordless: "Para confirmar que és mesmo tu, escreve o teu nome de utilizador e introduz um código de confirmação enviado para o teu email.",
      withPassword: "Para confirmar que és mesmo tu, introduz a tua palavra-passe e um código de confirmação enviado para o teu email.",
    },
    usernameConfirm: {
      label: "Escreve @{username} para confirmar",
      fallbackUsername: "o teu nome de utilizador",
      placeholderFallback: "@nomedeutilizador",
    },
    fallbackEmail: "o teu email",
    codePlaceholder: "123456",
    sendCodeButton: "Enviar-me um código de confirmação",
    confirmDelete: {
      message: "Última oportunidade — isto apaga permanentemente a tua conta e tudo o que ela contém.",
      confirm: "Eliminar tudo",
    },
    deleteButton: "Eliminar permanentemente a minha conta",
  },
  help: {
    screenTitle: "Ajuda e Tutorial",
    prompt: {
      title: "Bem-vindo(a) ao Greenie!",
      message: "Queres conhecer rapidamente o que podes fazer aqui?",
      takeTour: "Ver o tutorial",
      maybeLater: "Talvez mais tarde",
    },
    sections: {
      gettingStarted: {
        heading: "Como começar",
        body:
          "O Greenie tem cinco separadores na parte inferior: **Pessoas** para encontrar e seguir outros donos " +
          "de plantas, **Feed** para relatórios de progresso de quem segues, **Plantas** para a tua coleção, " +
          "**Cuidar** para organizar cuidados de plantas, e **Alertas** para as tuas notificações. Toca no teu " +
          "avatar no canto superior esquerdo de qualquer separador para abrir o teu perfil.",
      },
      plantsAndCareTasks: {
        heading: "Plantas e tarefas de cuidado",
        body:
          "Adiciona uma planta a partir do separador **Plantas** com o botão **+**. Cada planta pode ter " +
          "tarefas de rega, adubação e troca de terra com o seu próprio calendário — marca uma tarefa como " +
          "feita na página da planta e ela é reagendada automaticamente. Tarefas em atraso mostram um selo " +
          "vermelho; as feitas a tempo ficam verdes. Arquiva uma planta que já não estás a acompanhar " +
          "ativamente a partir da tua própria página — isto pausa os lembretes sem apagar nada, e podes " +
          "restaurá-la mais tarde em **Plantas Arquivadas**.",
      },
      aiLookup: {
        heading: "Identificação de plantas com IA",
        body:
          "Ao adicionar uma planta, tira ou escolhe uma fotografia e toca em **\"Identificar com IA\"** — o " +
          "Greenie vai tentar identificar a planta e sugerir o nome, a espécie e o calendário de cuidados. " +
          "Podes escrever um nome primeiro como pista, ou fazer uma pesquisa só por texto se preferires não usar " +
          "uma fotografia. Se a IA não tiver a certeza, mostra-te algumas hipóteses prováveis para escolher, " +
          "em vez de adivinhar.",
      },
      progressAndPhotos: {
        heading: "Relatórios de progresso e fotografias",
        body:
          "Regista um relatório de progresso na página de uma planta para acompanhar o seu crescimento — " +
          "adiciona uma altura, uma nota e uma fotografia, se quiseres. Relatórios com altura constroem um " +
          "gráfico de crescimento ao longo do tempo. Escolhe se um relatório é **partilhado no Feed** (visível " +
          "a quem te segue) ou fica **não listado** (só acessível a partir da página da própria planta).",
      },
      notificationsAndStreaks: {
        heading: "Notificações e sequências de cuidados",
        body:
          "O separador **Alertas** reúne tudo: comentários, gostos, pedidos de seguidor e lembretes de tarefas " +
          "de cuidado. Ativa as notificações push nas **Definições** para as receber também no teu dispositivo. " +
          "Sempre que concluíres a tempo todas as tarefas de cuidado do dia, a tua sequência de cuidados sobe um " +
          "dia — se falhares uma, reinicia. Se estiveres a cuidar das plantas de alguém, uma tarefa em atraso na " +
          "planta dessa pessoa dá-te um dia de tolerância antes de afetar a tua própria sequência.",
      },
      social: {
        heading: "Social",
        body:
          "Segue outros donos de plantas em **Pessoas** para ver os seus relatórios de progresso públicos no teu " +
          "**Feed**. Podes gostar e comentar qualquer relatório que consigas ver. Se a conta de alguém for " +
          "privada, terás primeiro de enviar um pedido para seguir. Podes **bloquear** uma conta (esconde o " +
          "conteúdo de ambos os lados) ou **denunciar** um relatório, comentário ou conta específicos que " +
          "quebrem as regras.",
      },
      plantSitting: {
        heading: "Cuidar de plantas",
        body:
          "Pede a um seguidor mútuo para cuidar das tuas plantas enquanto estás fora, a partir do separador " +
          "**Cuidar** — depois de aceitar, ele passa a ver as tuas tarefas de cuidado, pode marcá-las como " +
          "feitas, e registar relatórios de progresso em teu nome enquanto durar o acordo. As tarefas que ele " +
          "completar contam para a sequência de cuidados **dele**, não para a tua — a tua própria sequência " +
          "simplesmente pausa enquanto ele cuida das tuas plantas. Se ele falhar uma tarefa, tem um dia de " +
          "tolerância antes de isso afetar a sequência dele.",
      },
      supporterBadges: {
        heading: "Selos de apoiante",
        body:
          "Doar através do **Buy Me a Coffee** (ligado a partir das Definições) dá-te um selo de apoiante, com " +
          "níveis mais altos desbloqueados a partir de determinados valores — escreve o teu " +
          "**@nomedeutilizador** no checkout para ser associado automaticamente à tua conta. Existe também um " +
          "selo separado para testadores beta. Podes escolher que selos mostrar no teu perfil a partir das " +
          "**Definições**.",
      },
      privacyAndData: {
        heading: "Privacidade e os teus dados",
        body:
          "Controla quem pode ver as tuas plantas, relatórios de progresso e lista de seguidores em " +
          "**Definições → Privacidade**. Em **Definições → Os teus dados**, transfere tudo o que o Greenie " +
          "guarda sobre ti, ou recebe uma cópia por email. Eliminar a tua conta em **Definições → Zona de " +
          "perigo** é imediato e permanente.",
      },
    },
  },
  privacyPolicy: {
    screenTitle: "Política de Privacidade",
    lastUpdated: "Última atualização: 1 de agosto de 2026",
    sections: {
      whatWeStore: {
        heading: "O que o Greenie guarda",
        body:
          "A sua conta: endereço de email, nome de utilizador, nome a mostrar, biografia, as suas definições " +
          "de privacidade, preferências de notificação e (se utilizar notificações push) o token push do seu " +
          "dispositivo. As suas plantas: nomes, alcunhas, espécie, localização, datas de aquisição e " +
          "calendários de cuidados. A sua atividade: relatórios de progresso, comentários, gostos, quem segue " +
          "ou quem o segue, contas que bloqueou, acordos de cuidado de plantas de que faz parte, as suas " +
          "estatísticas de sequência de cuidados, notificações sobre atividade na sua conta, e quaisquer " +
          "denúncias de conteúdo que tenha feito. Apoio e reconhecimento: se apoiou o desenvolvimento do " +
          "Greenie, o seu total de doações e nível de selo de apoiante; se é testador beta, esse estado; e a " +
          "sua preferência de visibilidade para cada selo. Fotos: qualquer foto que anexe ao seu perfil, a " +
          "uma planta, ou a um relatório de progresso.",
      },
      whereItLives: {
        heading: "Onde os dados residem",
        body:
          "Todos os dados, incluindo as fotos carregadas, são guardados num projeto Supabase (base de dados " +
          "Postgres, autenticação e armazenamento de ficheiros). O acesso é protegido por segurança ao nível " +
          "da linha (row-level security): o conteúdo privado é imposto pela própria base de dados, não " +
          "apenas ocultado pela aplicação.",
      },
      whatLeavesTheApp: {
        heading: "O que sai da aplicação",
        body:
          "Quando utiliza a identificação de plantas por IA ao adicionar uma planta, o nome, descrição ou " +
          "foto da planta que fornece é enviado à Google Gemini para identificar a espécie e sugerir um " +
          "calendário de rega. Nenhum dado da conta é associado a esse pedido. Os emails da conta — " +
          "confirmação de registo, redefinição de palavra-passe e códigos de eliminação de conta — são " +
          "enviados através do Resend, o nosso fornecedor de entrega de email. Se utilizar Definições → Os " +
          "seus dados → Enviar-me uma cópia por email, a sua exportação de dados completa também é enviada " +
          "através do Resend como anexo de email para o endereço da sua própria conta. Se tiver as " +
          "notificações push ativadas, o token push do seu dispositivo e o conteúdo de uma notificação (por " +
          "exemplo, um lembrete de tarefa de cuidado) passam pelo serviço de notificações push da Expo para " +
          "chegar ao seu dispositivo. Se criar conta ou iniciar sessão com o Google, o Google partilha o seu " +
          "endereço de email e nome com o Greenie para criar ou associar a sua conta — mais nada. Se apoiar " +
          "o projeto através do Buy Me a Coffee e a doação puder ser associada à sua conta (por email ou " +
          "mencionando o seu @nomedeutilizador), o Buy Me a Coffee envia-nos o seu email, nome, mensagem e " +
          "valor da doação para podermos creditar a sua conta; se não puder ser associada automaticamente, " +
          "essa informação é revista manualmente. Para além do que é descrito nesta secção, mais nada é " +
          "enviado a, ou recebido de, terceiros.",
      },
      whatWeDontDo: {
        heading: "O que o Greenie não faz",
        body: "Sem publicidade, sem rastreio, sem análises, sem venda de dados — nada disso existe nesta aplicação.",
      },
      yourRights: {
        heading: "Os seus direitos",
        body:
          "Retificação: edite os detalhes do seu perfil na página de Perfil, a qualquer momento. " +
          "Portabilidade: transfira tudo o que o Greenie guarda sobre si como um ficheiro JSON a partir de " +
          "Definições → Os seus dados, ou receba uma cópia por email no endereço da sua conta. Apagamento: " +
          "elimine permanentemente a sua conta e todos os seus dados — incluindo as suas plantas, " +
          "relatórios, comentários, gostos, seguidores e fotos carregadas — a partir de Definições → Zona de " +
          "perigo. A eliminação é imediata e irreversível.",
      },
      consent: {
        heading: "Consentimento",
        body:
          "Criar uma conta requer que concorde com esta política; o momento em que concorda é guardado com " +
          "o seu perfil. Se esta política sofrer alterações substanciais, ser-lhe-á pedido que a reveja " +
          "novamente.",
      },
    },
  },
  termsOfUse: {
    screenTitle: "Termos de Utilização",
    lastUpdated: "Última atualização: 3 de agosto de 2026",
    sections: {
      acceptance: {
        heading: "Aceitação destes Termos",
        body:
          "Ao criar uma conta ou utilizar o Greenie, concorda com estes Termos de Utilização e com a nossa " +
          "Política de Privacidade. Se não concordar, não utilize a aplicação.",
      },
      account: {
        heading: "A sua conta",
        body:
          "Tem de ter pelo menos 13 anos para utilizar o Greenie. É responsável pela atividade na sua conta " +
          "e por manter a sua palavra-passe segura. Os nomes de utilizador e o conteúdo do perfil não podem " +
          "fazer-se passar por outra pessoa ou organização.",
      },
      userContent: {
        heading: "O seu conteúdo e conduta",
        body:
          "Mantém a propriedade das plantas, fotografias, relatórios de progresso, comentários e restante " +
          "conteúdo que publica (\"o seu conteúdo\"). Ao publicá-lo, concede ao Greenie uma licença limitada " +
          "para o armazenar, exibir e partilhar dentro da aplicação, de acordo com as suas próprias " +
          "definições de privacidade — nada mais. " +
          "Compromete-se a não publicar nem partilhar conteúdo que: seja ilegal, de assédio, de ódio ou " +
          "ameaçador; seja sexualmente explícito, ou que de alguma forma envolva a exploração ou colocação " +
          "em risco de um menor; se faça passar por outra pessoa; viole direitos de autor, marcas " +
          "registadas ou outros direitos de terceiros; seja spam, uma burla ou código malicioso; ou que de " +
          "outra forma viole estes Termos.",
      },
      moderation: {
        heading: "Moderação e aplicação",
        body:
          "O Greenie disponibiliza ferramentas na aplicação para denunciar conteúdo ou contas (Denunciar) " +
          "e para bloquear outros utilizadores (Bloquear). Podemos analisar conteúdo denunciado, remover " +
          "conteúdo que viole estes Termos e suspender ou encerrar contas que os violem de forma repetida " +
          "ou grave, com ou sem aviso prévio.",
      },
      aiFeatures: {
        heading: "Identificação de plantas assistida por IA",
        body:
          "A identificação de plantas por fotografia do Greenie utiliza o Google Gemini para sugerir o " +
          "nome, a espécie e o calendário de cuidados de uma planta. Estas sugestões são meramente " +
          "informativas e podem estar incorretas ou incompletas — não substituem aconselhamento " +
          "profissional, e não deve utilizá-las como única fonte de informação sobre a segurança de uma " +
          "planta, incluindo a sua toxicidade para pessoas ou animais de estimação.",
      },
      thirdParty: {
        heading: "Serviços de terceiros",
        body:
          "O Greenie depende de serviços de terceiros para funcionar — incluindo o Supabase para " +
          "armazenamento de dados, o Google Gemini para identificação de plantas, o Resend para envio de " +
          "emails e o Expo para notificações push. Consulte a nossa Política de Privacidade para mais " +
          "detalhes sobre o que é partilhado com cada um.",
      },
      disclaimers: {
        heading: "Isenções e limitação de responsabilidade",
        body:
          "O Greenie é fornecido \"tal como está\", sem garantias de qualquer tipo. Não garantimos que a " +
          "aplicação funcione sem interrupções ou erros, nem que qualquer conteúdo (incluindo sugestões " +
          "geradas por IA) seja exato. Na máxima medida permitida por lei, o Greenie e o seu criador não " +
          "são responsáveis por quaisquer danos indiretos, incidentais ou consequenciais resultantes da " +
          "utilização da aplicação, incluindo danos a uma planta, animal de estimação ou pessoa que se " +
          "tenha baseado em informação fornecida na aplicação.",
      },
      termination: {
        heading: "Cessação",
        body:
          "Pode deixar de utilizar o Greenie e eliminar a sua conta a qualquer momento em Definições → " +
          "Zona de perigo. Podemos suspender ou encerrar o seu acesso caso viole estes Termos, utilize " +
          "indevidamente o serviço, ou caso a aplicação seja descontinuada.",
      },
      changes: {
        heading: "Alterações a estes Termos",
        body:
          "Podemos atualizar estes Termos periodicamente. Se uma alteração for substancial, pediremos que " +
          "reveja e aceite novamente os Termos atualizados da próxima vez que utilizar a aplicação, tal " +
          "como fazemos com as atualizações da política de privacidade.",
      },
      governingLaw: {
        heading: "Lei aplicável",
        body:
          "Estes Termos regem-se pelas leis de Portugal e da União Europeia, sem consideração pelos " +
          "respetivos princípios de conflito de leis. Qualquer litígio decorrente destes Termos ou da " +
          "utilização do Greenie está sujeito à jurisdição exclusiva dos tribunais de Portugal.",
      },
      contact: {
        heading: "Contacto",
        body:
          "Tem dúvidas sobre estes Termos? Contacte-nos através da opção de feedback em Definições, ou " +
          "através do mesmo canal de contacto indicado na nossa Política de Privacidade.",
      },
    },
  },
};
