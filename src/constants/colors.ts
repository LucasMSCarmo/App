const palette = {
  // Base
  primary: '#6C63FF',
  primaryLight: '#9D97FF',
  primaryDark: '#4B44CC',

  // Feedback
  danger: '#FF4D4D',
  dangerLight: '#FF8080',
  dangerDark: '#CC0000',
  success: '#4CAF50',
  successLight: '#80C883',
  successDark: '#2E7D32',
  warning: '#FF9800',
  warningLight: '#FFB74D',
  warningDark: '#E65100',
  info: '#2196F3',
  infoLight: '#64B5F6',
  infoDark: '#1565C0',

  // Neutros
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Dark neutros
  dark50: '#1A1A1A',
  dark100: '#1E1E1E',
  dark200: '#242424',
  dark300: '#2C2C2C',
  dark400: '#333333',
  dark500: '#3D3D3D',
  dark600: '#474747',
};

export const Colors = {
  light: {
    // === BASE ===
    background: palette.white,
    surface: palette.gray100,
    surfaceVariant: palette.gray200,
    surfaceElevated: palette.white,
    border: palette.gray300,
    borderSubtle: palette.gray200,
    divider: palette.gray200,

    // === TEXTO ===
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textMuted: '#9E9E9E',
    textDisabled: palette.gray400,
    textInverse: palette.white,
    textOnPrimary: palette.white,
    textOnDanger: palette.white,
    textOnSuccess: palette.white,

    // === CORES PRIMÁRIAS ===
    primary: palette.primary,
    primaryLight: palette.primaryLight,
    primaryDark: palette.primaryDark,
    primarySurface: '#EEEDff',      // fundo sutil com tom primário

    // === FEEDBACK ===
    danger: palette.danger,
    dangerLight: palette.dangerLight,
    dangerSurface: '#FFEEEE',
    success: palette.success,
    successLight: palette.successLight,
    successSurface: '#EEFBEE',
    warning: palette.warning,
    warningLight: palette.warningLight,
    warningSurface: '#FFF8EE',
    info: palette.info,
    infoLight: palette.infoLight,
    infoSurface: '#EEF5FF',

    // === BOTÕES ===
    buttonPrimary: palette.primary,
    buttonPrimaryText: palette.white,
    buttonPrimaryPressed: palette.primaryDark,
    buttonDanger: palette.danger,
    buttonDangerText: palette.white,
    buttonDangerPressed: palette.dangerDark,
    buttonSuccess: palette.success,
    buttonSuccessText: palette.white,
    buttonSuccessPressed: palette.successDark,
    buttonCancel: palette.gray200,
    buttonCancelText: '#1A1A1A',
    buttonCancelPressed: palette.gray300,
    buttonDisabled: palette.gray300,
    buttonDisabledText: palette.gray500,
    buttonOutlineBorder: palette.primary,
    buttonOutlineText: palette.primary,

    // === CARDS ===
    cardBackground: palette.white,
    cardBorder: palette.gray200,
    cardShadow: 'rgba(0,0,0,0.08)',
    cardPressed: palette.gray100,
    cardHighlight: '#EEEDff',

    // === CALENDÁRIO ===
    calendarBackground: palette.white,
    calendarHeader: palette.white,
    calendarHeaderText: '#1A1A1A',
    calendarDayText: '#1A1A1A',
    calendarDayTextDisabled: palette.gray400,
    calendarDayTextSecondary: palette.gray500,       // dias de outros meses
    calendarDaySelected: palette.primary,
    calendarDaySelectedText: palette.white,
    calendarDayToday: '#EEEDff',
    calendarDayTodayText: palette.primary,
    calendarDayTodayBorder: palette.primary,
    calendarDayHasEvent: palette.primary,            // ponto indicador de evento
    calendarWeekHeader: palette.gray500,             // seg, ter, qua...
    calendarCardBackground: palette.white,
    calendarCardBorder: palette.gray200,
    calendarCardText: '#1A1A1A',
    calendarCardTimeText: palette.gray500,
    calendarCardCategory: palette.primaryLight,

    // === SIDEBAR / DRAWER ===
    sidebarBackground: palette.white,
    sidebarBorder: palette.gray200,
    sidebarHeader: palette.gray100,
    sidebarHeaderText: '#1A1A1A',
    sidebarItem: 'transparent',
    sidebarItemActive: '#EEEDff',
    sidebarItemText: '#1A1A1A',
    sidebarItemTextActive: palette.primary,
    sidebarItemIcon: palette.gray600,
    sidebarItemIconActive: palette.primary,
    sidebarDivider: palette.gray200,
    sidebarBadge: palette.primary,
    sidebarBadgeText: palette.white,

    // === INPUTS ===
    inputBackground: palette.gray100,
    inputBorder: palette.gray300,
    inputBorderFocused: palette.primary,
    inputBorderError: palette.danger,
    inputText: '#1A1A1A',
    inputPlaceholder: palette.gray400,
    inputLabel: '#1A1A1A',
    inputError: palette.danger,
    inputIcon: palette.gray500,

    // === TABS / NAVEGAÇÃO ===
    tabBarBackground: palette.white,
    tabBarBorder: palette.gray200,
    tabBarActive: palette.primary,
    tabBarInactive: palette.gray400,

    // === BADGES / TAGS ===
    badgePrimary: palette.primary,
    badgePrimaryText: palette.white,
    badgeSuccess: palette.success,
    badgeSuccessText: palette.white,
    badgeDanger: palette.danger,
    badgeDangerText: palette.white,
    badgeWarning: palette.warning,
    badgeWarningText: palette.white,
    badgeNeutral: palette.gray200,
    badgeNeutralText: palette.gray700,

    // === PRIORIDADES ===
    priorityHigh: palette.danger,
    priorityMedium: palette.warning,
    priorityLow: palette.success,
    priorityNone: palette.gray400,

    // === STATUS ===
    statusPending: palette.warning,
    statusInProgress: palette.info,
    statusDone: palette.success,
    statusCancelled: palette.danger,

    // === OVERLAYS / MODAIS ===
    modalBackground: palette.white,
    modalOverlay: 'rgba(0,0,0,0.5)',
    modalBorder: palette.gray200,
    modalHandle: palette.gray300,

    // === SKELETON / LOADING ===
    skeletonBase: palette.gray200,
    skeletonHighlight: palette.gray100,
  },

  dark: {
    // === BASE ===
    background: '#121212',
    surface: palette.dark100,
    surfaceVariant: palette.dark300,
    surfaceElevated: palette.dark200,
    border: palette.dark300,
    borderSubtle: palette.dark200,
    divider: palette.dark300,

    // === TEXTO ===
    text: '#F1F1F1',
    textSecondary: '#A1A1A1',
    textMuted: '#6B6B6B',
    textDisabled: palette.dark600,
    textInverse: '#1A1A1A',
    textOnPrimary: palette.white,
    textOnDanger: palette.white,
    textOnSuccess: palette.white,

    // === CORES PRIMÁRIAS ===
    primary: palette.primary,
    primaryLight: palette.primaryLight,
    primaryDark: palette.primaryDark,
    primarySurface: '#1E1B3A',

    // === FEEDBACK ===
    danger: palette.danger,
    dangerLight: palette.dangerLight,
    dangerSurface: '#2A1515',
    success: palette.success,
    successLight: palette.successLight,
    successSurface: '#152A15',
    warning: palette.warning,
    warningLight: palette.warningLight,
    warningSurface: '#2A1E10',
    info: palette.info,
    infoLight: palette.infoLight,
    infoSurface: '#101E2A',

    // === BOTÕES ===
    buttonPrimary: palette.primary,
    buttonPrimaryText: palette.white,
    buttonPrimaryPressed: palette.primaryDark,
    buttonDanger: palette.danger,
    buttonDangerText: palette.white,
    buttonDangerPressed: palette.dangerDark,
    buttonSuccess: palette.success,
    buttonSuccessText: palette.white,
    buttonSuccessPressed: palette.successDark,
    buttonCancel: palette.dark300,
    buttonCancelText: '#F1F1F1',
    buttonCancelPressed: palette.dark400,
    buttonDisabled: palette.dark400,
    buttonDisabledText: palette.dark600,
    buttonOutlineBorder: palette.primaryLight,
    buttonOutlineText: palette.primaryLight,

    // === CARDS ===
    cardBackground: palette.dark100,
    cardBorder: palette.dark300,
    cardShadow: 'rgba(0,0,0,0.3)',
    cardPressed: palette.dark200,
    cardHighlight: '#1E1B3A',

    // === CALENDÁRIO ===
    calendarBackground: '#121212',
    calendarHeader: '#121212',
    calendarHeaderText: '#F1F1F1',
    calendarDayText: '#F1F1F1',
    calendarDayTextDisabled: palette.dark600,
    calendarDayTextSecondary: palette.dark500,
    calendarDaySelected: palette.primary,
    calendarDaySelectedText: palette.white,
    calendarDayToday: '#1E1B3A',
    calendarDayTodayText: palette.primaryLight,
    calendarDayTodayBorder: palette.primary,
    calendarDayHasEvent: palette.primaryLight,
    calendarWeekHeader: palette.gray600,
    calendarCardBackground: palette.dark100,
    calendarCardBorder: palette.dark300,
    calendarCardText: '#F1F1F1',
    calendarCardTimeText: palette.gray500,
    calendarCardCategory: palette.primaryDark,

    // === SIDEBAR / DRAWER ===
    sidebarBackground: palette.dark100,
    sidebarBorder: palette.dark300,
    sidebarHeader: palette.dark200,
    sidebarHeaderText: '#F1F1F1',
    sidebarItem: 'transparent',
    sidebarItemActive: '#1E1B3A',
    sidebarItemText: '#F1F1F1',
    sidebarItemTextActive: palette.primaryLight,
    sidebarItemIcon: palette.gray500,
    sidebarItemIconActive: palette.primaryLight,
    sidebarDivider: palette.dark300,
    sidebarBadge: palette.primary,
    sidebarBadgeText: palette.white,

    // === INPUTS ===
    inputBackground: palette.dark200,
    inputBorder: palette.dark400,
    inputBorderFocused: palette.primaryLight,
    inputBorderError: palette.dangerLight,
    inputText: '#F1F1F1',
    inputPlaceholder: palette.gray600,
    inputLabel: '#F1F1F1',
    inputError: palette.dangerLight,
    inputIcon: palette.gray500,

    // === TABS / NAVEGAÇÃO ===
    tabBarBackground: palette.dark100,
    tabBarBorder: palette.dark300,
    tabBarActive: palette.primaryLight,
    tabBarInactive: palette.gray600,

    // === BADGES / TAGS ===
    badgePrimary: palette.primary,
    badgePrimaryText: palette.white,
    badgeSuccess: palette.success,
    badgeSuccessText: palette.white,
    badgeDanger: palette.danger,
    badgeDangerText: palette.white,
    badgeWarning: palette.warning,
    badgeWarningText: palette.white,
    badgeNeutral: palette.dark400,
    badgeNeutralText: '#F1F1F1',

    // === PRIORIDADES ===
    priorityHigh: palette.danger,
    priorityMedium: palette.warning,
    priorityLow: palette.success,
    priorityNone: palette.gray600,

    // === STATUS ===
    statusPending: palette.warning,
    statusInProgress: palette.info,
    statusDone: palette.success,
    statusCancelled: palette.danger,

    // === OVERLAYS / MODAIS ===
    modalBackground: palette.dark200,
    modalOverlay: 'rgba(0,0,0,0.7)',
    modalBorder: palette.dark400,
    modalHandle: palette.dark500,

    // === SKELETON / LOADING ===
    skeletonBase: palette.dark300,
    skeletonHighlight: palette.dark400,
  },
};