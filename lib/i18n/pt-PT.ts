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
      placeholder: "ex.: Pothos — deixe em branco para a IA identificar pela foto",
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
    lookupError: "Não foi possível identificar esta planta. Tente novamente.",
    lookupModal: {
      nameMismatch: {
        message: 'A IA identificou isto como "{aiName}", mas introduziu "{typedName}".',
        keepTyped: 'Manter "{typedName}"',
        useAi: 'Usar "{aiName}"',
      },
      ambiguous: {
        message: "Foram encontradas várias correspondências possíveis:",
      },
      notFound: {
        message:
          "Não foi possível identificar uma planta nesta foto. Tire uma nova fotografia, ou feche esta janela, escreva um nome comum acima e tente novamente.",
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
      message: "Enviámos um código de confirmação para {email}. Introduza-o abaixo para concluir a criação da sua conta.",
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
        link: "Política de Privacidade",
      },
      submitButton: "Criar conta",
      divider: "ou",
      googleButton: "Continuar com Google",
      signInLink: "Já tem uma conta? Iniciar sessão",
    },
  },
  welcome: {
    loadingScreenTitle: "Bem-vindo",
    errorScreenTitle: "Bem-vindo",
    error: "Erro: {error}",
    reconsent: {
      screenTitle: "Política de Privacidade",
      heading: "Atualização da Política de Privacidade",
      intro: "A política de privacidade foi alterada desde a última vez que a aceitou — reveja-a para continuar.",
      submitButton: "Aceitar e continuar",
      signOutLink: "Terminar sessão",
    },
    firstTime: {
      screenTitle: "Bem-vindo",
      heading: "Bem-vindo ao Greenie",
      intro: "Só mais um passo antes de continuar: confirme que está tudo correto e aceite a política de privacidade.",
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
      signOutLink: "Não é você? Terminar sessão",
    },
    consent: {
      prefix: "Li e concordo com a ",
      link: "Política de Privacidade",
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
      hint: "Sistema segue a definição do seu dispositivo.",
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
      hint: "Sistema segue o idioma do seu dispositivo.",
    },
    changePassword: {
      sectionTitle: "Alterar palavra-passe",
      googleOnlyHint: "Inicia sessão com Google — esta conta não tem palavra-passe.",
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
        "Conta Google associada — verifique {email} para o link de confirmação e concluir a alteração do email da conta.",
      currentEmail: "Email atual: {email}",
      newEmail: {
        label: "Novo email",
        placeholder: "nome@exemplo.com",
      },
      codeSent: "Código enviado para {email}",
      confirmationCode: { label: "Código de confirmação" },
      emailChanged: "Verifique {newEmail} para o link de confirmação e concluir a alteração.",
      confirmChangeButton: "Confirmar e alterar email",
      sendCodeButton: "Enviar código para o email atual",
      linkedAccounts: {
        label: "Contas associadas",
        googleLinked: "Conta Google associada ({email}).",
        webOnlyHint: "Por agora, associar uma conta Google só está disponível na versão web.",
        confirmLinkButton: "Confirmar e associar conta Google",
      },
    },
    privacy: {
      sectionTitle: "Privacidade",
      readPolicyLink: "Ler a Política de Privacidade",
      blockedUsersLink: "Utilizadores bloqueados",
      profileVisibility: {
        label: "Perfil",
        options: { public: "Público", private: "Privado" },
        hint: "Privado mostra apenas o seu nome, avatar e biografia a quem não o segue.",
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
          "Quando um cuidador regista um relatório de progresso numa das suas plantas, isto controla se pode partilhá-lo no seu próprio feed. Desativado: os relatórios ficam apenas no histórico desta planta.",
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
          "Receba notificações neste dispositivo. Aplica-se apenas a este dispositivo — desativar não afeta a sua caixa de entrada na aplicação.",
        permissionDeniedError:
          "A permissão de notificações foi recusada — ative as notificações para o Greenie nas definições do dispositivo e tente novamente.",
      },
      sectionIntro: "Escolha o que aparece nas suas notificações. Tudo o que estiver desativado nunca é criado — não é apenas ocultado.",
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
        "Se o Greenie lhe é útil, pode oferecer-me um café — totalmente opcional, é só uma forma de agradecer.",
      button: "Oferecer um café",
    },
    yourData: {
      sectionTitle: "Os seus dados",
      sectionIntro:
        "Tudo o que o Greenie guarda sobre si — a sua conta, plantas, calendários de cuidados, relatórios de progresso, comentários, gostos e seguidores — num ficheiro JSON. Transfira-o para este dispositivo, ou receba uma cópia no email associado à sua conta.",
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
        "Arquivar esta planta? Será escondida da sua lista de Plantas e os lembretes de cuidados serão pausados. Pode restaurá-la a qualquer momento em Plantas Arquivadas.",
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
    reasonLabel: "Porque está a denunciar isto?",
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
    emptyState: "Ainda não segue ninguém",
    noMatch: 'Ninguém que segue corresponde a "{query}"',
    searchPlaceholder: "pessoas que segue",
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
  },
  searchUsers: {
    screenTitle: "Pesquisar Utilizadores",
    placeholder: "utilizadores por nome ou nome de utilizador",
    error: "Erro: {error}",
    promptState: "Escreva um nome ou nome de utilizador para pesquisar",
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
    blockedNotice: "Bloqueou esta conta.",
    followButton: {
      follow: "Seguir",
      requested: "Pedido",
      unfollow: "Deixar de seguir",
    },
    confirmBlock: {
      message:
        "Bloquear esta conta? Deixará de poder segui-lo ou ver as suas plantas e relatórios de progresso, e também não verá os da pessoa bloqueada. Pode desbloquear a qualquer momento.",
      confirm: "Bloquear",
    },
    blockLink: "Bloquear esta conta",
    plantsSection: {
      privateNotice: "Esta conta é privada",
    },
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
      noPlants: "Ainda não tem plantas para partilhar instruções de cuidado.",
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
      notSittingForAnyone: "De momento não está a cuidar das plantas de ninguém",
      noSitters: "Ainda não pediu a ninguém para cuidar das suas plantas",
      noHistory: "Ainda sem histórico de cuidadores",
    },
    sentRequestRow: {
      keep: "Manter",
    },
    confirmCancelRequest: {
      message: "Cancelar o seu pedido de cuidado de plantas a {name}?",
    },
  },
  requestSitting: {
    screenTitle: "Pedir Cuidado de Plantas",
    sitterFallback: "este seguidor",
    intro:
      "Peça a {sitterName} para cuidar de todas as suas plantas enquanto está fora. Vai poder ver as suas tarefas de cuidado, marcá-las como feitas, e registar novos relatórios de progresso em seu nome.",
    startDate: {
      label: "Data de início (opcional)",
    },
    endDate: {
      label: "Data de fim (opcional)",
      rangeError: "A data de fim deve ser igual ou posterior à data de início",
      hint:
        "Deixe ambos em branco para um pedido sem data definida que pode cancelar a qualquer momento. O acesso abre na data de início e fecha após a data de fim -- aceitar mais cedo não antecipa a abertura.",
    },
    sendButton: "Enviar pedido",
  },
  selectSitter: {
    screenTitle: "Escolher um Cuidador",
    error: "Erro: {error}",
    emptyState: "Ainda não tem seguidores mútuos -- para cuidar de plantas é preciso seguirem-se mutuamente.",
  },
  notificationsScreen: {
    error: "Erro: {error}",
    emptyState: "Ainda nada por aqui",
    sentence: {
      comment: "{name} comentou o seu relatório",
      like: "{name} gostou do seu relatório",
      followRequest: "{name} pediu para o seguir",
      newFollower: "{name} começou a segui-lo",
      followAccepted: "{name} aceitou o seu pedido para seguir",
      sittingRequest: "{name} pediu-lhe para cuidar das plantas",
      sittingAccepted: "{name} aceitou o seu pedido de cuidado de plantas",
      sittingDeclined: "{name} recusou o seu pedido de cuidado de plantas",
      careDueWater: "Hora de regar {plant}",
      careDueFertilize: "Hora de adubar {plant}",
      careDueRepot: "Hora de trocar a terra de {plant}",
    },
    plantFallback: "a sua planta",
  },
  profile: {
    screenTitle: "Perfil",
    error: "Erro: {error}",
    username: {
      cooldownHint: "Pode voltar a alterar o nome de utilizador a {date}",
    },
    bio: {
      label: "Biografia",
      placeholder: "Fale um pouco sobre si a outros amantes de plantas",
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
    heading: "Eliminar a sua conta",
    intro:
      "Esta página permite eliminar permanentemente a sua conta Greenie e todos os seus dados sem precisar de instalar a aplicação. Inicie sessão para continuar — a eliminação continua a exigir a confirmação de um código enviado para o email da sua conta, tal como ao eliminar dentro da aplicação.",
    deletedMessage:
      "A sua conta foi eliminada. Tudo o que estava associado a ela — o seu perfil, plantas, calendários de cuidados, relatórios de progresso, comentários, gostos e seguidores — foi removido permanentemente.",
  },
  accountDeletionFlow: {
    sectionIntro: {
      base:
        "Eliminar a sua conta remove permanentemente o seu perfil, plantas, calendários de cuidados, relatórios de progresso, comentários, gostos e seguidores. Esta ação não pode ser desfeita.",
      passwordless: "Para confirmar que é mesmo você, escreva o seu nome de utilizador e introduza um código de confirmação enviado para o seu email.",
      withPassword: "Para confirmar que é mesmo você, introduza a sua palavra-passe e um código de confirmação enviado para o seu email.",
    },
    usernameConfirm: {
      label: "Escreva @{username} para confirmar",
      fallbackUsername: "o seu nome de utilizador",
      placeholderFallback: "@nomedeutilizador",
    },
    fallbackEmail: "o seu email",
    codePlaceholder: "123456",
    sendCodeButton: "Enviar-me um código de confirmação",
    confirmDelete: {
      message: "Última oportunidade — isto apaga permanentemente a sua conta e tudo o que ela contém.",
      confirm: "Eliminar tudo",
    },
    deleteButton: "Eliminar permanentemente a minha conta",
  },
};
