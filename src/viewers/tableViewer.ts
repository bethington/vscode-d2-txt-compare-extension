import * as vscode from 'vscode';
import * as fs from 'fs';

export interface TableColumn {
    header: string;
    originalHeader: string;
    width: number;
    align: 'left' | 'center' | 'right';
    type: 'text' | 'number' | 'boolean';
}

export interface TableData {
    columns: TableColumn[];
    rows: string[][];
    fileName: string;
    filePath: string;
}

// Default header mappings based on D2 sample data
const DEFAULT_HEADER_MAPPINGS: { [key: string]: string } = {
    "1.09-Save Add": "1SAdd",
    "1.09-Save Bits": "1SBits",
    "1ofN": "1ofN",
    "1or2handed": "1or2ha",
    "2handed": "2hande",
    "2handedwclass": "2hande",
    "2handmaxdam": "2handm",
    "2handmindam": "2handm",
    "3dSpread": "3dSpread",
    "4737": "4737",
    "A1MaxD": "A1MaxD",
    "A1MaxD(H)": "A1MaxDH",
    "A1MaxD(N)": "A1MaxDN",
    "A1MinD": "A1MinD",
    "A1MinD(H)": "A1MinDH",
    "A1MinD(N)": "A1MinDN",
    "A1TH": "A1TH",
    "A1TH(H)": "A1THH",
    "A1TH(N)": "A1THN",
    "A1mv": "A1mv",
    "A2MaxD": "A2MaxD",
    "A2MaxD(H)": "A2MaxDH",
    "A2MaxD(N)": "A2MaxDN",
    "A2MinD": "A2MinD",
    "A2MinD(H)": "A2MinDH",
    "A2MinD(N)": "A2MinDN",
    "A2TH": "A2TH",
    "A2TH(H)": "A2THH",
    "A2TH(N)": "A2THN",
    "A2mv": "A2mv",
    "AC": "AC",
    "AC(H)": "ACH",
    "AC(N)": "ACN",
    "AI": "AI",
    "AR": "AR",
    "AR/Lvl": "AR/Lvl",
    "Accel": "Accel",
    "Act": "Act",
    "Activate": "Activa",
    "Add": "Add",
    "AiCurseDivisor": "ACDiv",
    "AkaraMagicLvl": "AMLvl",
    "AkaraMagicMax": "AMMax",
    "AkaraMagicMin": "AMMin",
    "AkaraMax": "AkaraMax",
    "AkaraMin": "AkaraMin",
    "Align": "Align",
    "AlkorMagicLvl": "AMLvl",
    "AlkorMagicMax": "AMMax",
    "AlkorMagicMin": "AMMin",
    "AlkorMax": "AlkorMax",
    "AlkorMin": "AlkorMin",
    "AlwaysExplode": "AExplod",
    "Amazon": "Amazon",
    "AnimLen": "AnimLen",
    "AnimRate": "AnimRate",
    "AnimSpeed": "ASpeed",
    "Animate": "Animat",
    "AnyaMagicLvl": "AMLvl",
    "AnyaMagicMax": "AMMax",
    "AnyaMagicMin": "AMMin",
    "AnyaMax": "AnyaMax",
    "AnyaMin": "AnyaMin",
    "ApplyMastery": "AMaster",
    "Arg0": "Arg0",
    "Arg1": "Arg1",
    "AshearaMagicLvl": "AMLvl",
    "AshearaMagicMax": "AMMax",
    "AshearaMagicMin": "AMMin",
    "AshearaMax": "AMax",
    "AshearaMin": "AMin",
    "Assassin": "Assass",
    "Att1Del": "Att1De",
    "Att1Prb": "Att1Pr",
    "Att2Del": "Att2De",
    "Att2Prb": "Att2Pr",
    "Attack1": "Attack1",
    "Attack2": "Attack2",
    "AttackNoMana": "ANMana",
    "AutoMap": "AutoMap",
    "AutoPos": "AutoPos",
    "AutoStack": "AStack",
    "Barbarian": "Brbrn",
    "BaseCost": "BaseCost",
    "BaseId": "BaseId",
    "BaseW": "BaseW",
    "Beltable": "Beltab",
    "BetterGem": "BGem",
    "BlankScreen": "BScreen",
    "Bleed": "Bleed",
    "Block 1": "Block1",
    "Block 2": "Block2",
    "Block 3": "Block3",
    "BlockFactor": "BFactor",
    "BlockMissile": "BlockMis",
    "BlocksLight0": "BLight0",
    "BlocksLight1": "BLight1",
    "BlocksLight2": "BLight2",
    "BlocksLight3": "BLight3",
    "BlocksLight4": "BLight4",
    "BlocksLight5": "BLight5",
    "BlocksLight6": "BLight6",
    "BlocksLight7": "BLight7",
    "BlocksVis": "BVis",
    "Blue": "Blue",
    "Body": "Body",
    "Body Location": "BLocati",
    "BodyLoc1": "BodyLoc1",
    "BodyLoc2": "BodyLoc2",
    "BookSkill": "BSkill",
    "BookSpellCode": "BSCode",
    "BordType": "BordType",
    "BossXfer": "BossXfer",
    "CHitCalc1": "CCalc1",
    "CSvBits": "CSvBits",
    "CSvParam": "CSvParam",
    "CSvSigned": "CSigned",
    "CainMagicLvl": "CMLvl",
    "CainMagicMax": "CMMax",
    "CainMagicMin": "CMMin",
    "CainMax": "CainMax",
    "CainMin": "CainMin",
    "CanDestroy": "CDestro",
    "CanSlow": "CanSlow",
    "CannotDesecrate": "CDscrte",
    "Cel1": "Cel1",
    "Cel2": "Cel2",
    "Cel3": "Cel3",
    "Cel4": "Cel4",
    "CelFile": "CelFile",
    "ChampionDamageBonus": "CDBonus",
    "Chance1": "Chance1",
    "Chance2": "Chance2",
    "Chance3": "Chance3",
    "Chance4": "Chance4",
    "Chance5": "Chance5",
    "Chance6": "Chance6",
    "ChancePerLvl1": "CPLvl1",
    "ChancePerLvl2": "CPLvl2",
    "ChancePerLvl3": "CPLvl3",
    "ChancePerLvl4": "CPLvl4",
    "ChancePerLvl5": "CPLvl5",
    "ChancePerLvl6": "CPLvl6",
    "Channel": "Chan",
    "Character": "Char",
    "CharsiMagicLvl": "CMLvl",
    "CharsiMagicMax": "CMMax",
    "CharsiMagicMin": "CMMin",
    "CharsiMax": "CMax",
    "CharsiMin": "CMin",
    "CheckAll": "CheckAll",
    "Class": "Class",
    "Class Specific": "CSpecif",
    "ClearSelectedOnHold": "CSOHold",
    "ClientCol": "CCol",
    "ClientFn": "ClientFn",
    "ClientSend": "CSend",
    "CltCalc1": "CltCalc1",
    "CltHitSubMissile1": "CHSMis1",
    "CltHitSubMissile2": "CHSMis2",
    "CltHitSubMissile3": "CHSMis3",
    "CltHitSubMissile4": "CHSMis4",
    "CltParam1": "CParam1",
    "CltParam2": "CParam2",
    "CltParam3": "CParam3",
    "CltParam4": "CParam4",
    "CltParam5": "CParam5",
    "CltSrcTown": "CSTown",
    "CltSubMissile1": "CSMis1",
    "CltSubMissile2": "CSMis2",
    "CltSubMissile3": "CSMis3",
    "Code": "Code",
    "CollideFriend": "CFriend",
    "CollideKill": "CKill",
    "CollideType": "CType",
    "Collision": "Coll",
    "CollisionSubst": "CSubst",
    "Compound": "Comp",
    "ContinueCastUnselected": "CCUnsele",
    "CostPerCharge": "CPCharge",
    "Crit": "Crit",
    "CvtMo1": "CvtMo1",
    "CvtMo2": "CvtMo2",
    "CvtMo3": "CvtMo3",
    "CvtSk1": "CvtSk1",
    "CvtSk2": "CvtSk2",
    "CvtSk3": "CvtSk3",
    "CvtTgt1": "CvtTgt1",
    "CvtTgt2": "CvtTgt2",
    "CvtTgt3": "CvtTgt3",
    "CycleAnim0": "CAnim0",
    "CycleAnim1": "CAnim1",
    "CycleAnim2": "CAnim2",
    "CycleAnim3": "CAnim3",
    "CycleAnim4": "CAnim4",
    "CycleAnim5": "CAnim5",
    "CycleAnim6": "CAnim6",
    "CycleAnim7": "CAnim7",
    "DENSITY0": "Dense0",
    "DENSITY1": "Dense1",
    "DENSITY2": "Dense2",
    "DENSITY3": "Dense3",
    "DENSITY4": "Dense4",
    "DENSITY5": "Dense5",
    "DENSITY6": "Dense6",
    "DENSITY7": "Dense7",
    "DM": "DM",
    "DM(H)": "DMH",
    "DM(N)": "DMN",
    "Damage": "Damage",
    "DamageRate": "DRate",
    "DamageRegen": "DRegen",
    "Day Ambience": "DayAmb",
    "Day Event": "DayEvent",
    "DeaDelay": "DeaDelay",
    "DeathExpPenalty": "DEPenalt",
    "DeathSound": "DSound",
    "Def": "Def",
    "Def/Lvl": "Def/Lv",
    "DefaultChance": "DChance",
    "Defense": "Defens",
    "Defer Inst": "DInst",
    "Delay": "Delay",
    "Depend": "Depend",
    "DescStr": "DescStr",
    "Dex": "Dex",
    "Dex/Lvl": "Dex/Lv",
    "DexBonus": "DexBonus",
    "Difficulty": "Diffic",
    "Direction": "Dir",
    "Dmg-Max": "DmgMax",
    "Dmg-Min": "DmgMin",
    "Dmg/Lvl": "Dmg/Lv",
    "DmgCalc1": "DmgCalc1",
    "DmgSymPerCalc": "DSPCalc",
    "Drain": "Drain",
    "Drain(H)": "DrainH",
    "Drain(N)": "DrainN",
    "Draw": "Draw",
    "DrawEdges": "DEdges",
    "DrawUnder": "DUnder",
    "DrlgType": "DrlgType",
    "DrognanMagicLvl": "DMLvl",
    "DrognanMagicMax": "DMMax",
    "DrognanMagicMin": "DMMin",
    "DrognanMax": "DMax",
    "DrognanMin": "DMin",
    "Druid": "Druid",
    "Dt1Mask": "Dt1Mas",
    "Duration": "Durati",
    "Duration in frames": "Diframes",
    "EDmgSymPerCalc": "ESPCalc",
    "ELen": "ELen",
    "ELenSymPerCalc": "ESPCalc",
    "ELevLen1": "ELevLen1",
    "ELevLen2": "ELevLen2",
    "ELevLen3": "ELevLen3",
    "EMax": "EMax",
    "EMaxLev1": "EMaxLev1",
    "EMaxLev2": "EMaxLev2",
    "EMaxLev3": "EMaxLev3",
    "EMaxLev4": "EMaxLev4",
    "EMaxLev5": "EMaxLev5",
    "EMin": "EMin",
    "EMinLev1": "EMinLev1",
    "EMinLev2": "EMinLev2",
    "EMinLev3": "EMinLev3",
    "EMinLev4": "EMinLev4",
    "EMinLev5": "EMinLev5",
    "EOL": "EOL",
    "EType": "EType",
    "El1Dur": "El1Dur",
    "El1Dur(H)": "El1DurH",
    "El1Dur(N)": "El1DurN",
    "El1MaxD": "El1MaxD",
    "El1MaxD(H)": "El1MaxDH",
    "El1MaxD(N)": "El1MaxDN",
    "El1MinD": "El1MinD",
    "El1MinD(H)": "El1MinDH",
    "El1MinD(N)": "El1MinDN",
    "El1Mode": "El1Mod",
    "El1Pct": "El1Pct",
    "El1Pct(H)": "El1PctH",
    "El1Pct(N)": "El1PctN",
    "El1Type": "El1Typ",
    "El2Dur": "El2Dur",
    "El2Dur(H)": "El2DurH",
    "El2Dur(N)": "El2DurN",
    "El2MaxD": "El2MaxD",
    "El2MaxD(H)": "El2MaxDH",
    "El2MaxD(N)": "El2MaxDN",
    "El2MinD": "El2MinD",
    "El2MinD(H)": "El2MinDH",
    "El2MinD(N)": "El2MinDN",
    "El2Mode": "El2Mod",
    "El2Pct": "El2Pct",
    "El2Pct(H)": "El2PctH",
    "El2Pct(N)": "El2PctN",
    "El2Type": "El2Typ",
    "El3Dur": "El3Dur",
    "El3Dur(H)": "El3DurH",
    "El3Dur(N)": "El3DurN",
    "El3MaxD": "El3MaxD",
    "El3MaxD(H)": "El3MaxDH",
    "El3MaxD(N)": "El3MaxDN",
    "El3MinD": "El3MinD",
    "El3MinD(H)": "El3MinDH",
    "El3MinD(N)": "El3MinDN",
    "El3Mode": "El3Mod",
    "El3Pct": "El3Pct",
    "El3Pct(H)": "El3PctH",
    "El3Pct(N)": "El3PctN",
    "El3Type": "El3Typ",
    "Elemental Type": "ElemType",
    "ElzixMagicLvl": "EMLvl",
    "ElzixMagicMax": "EMMax",
    "ElzixMagicMin": "EMMin",
    "ElzixMax": "ElzixMax",
    "ElzixMin": "ElzixMin",
    "Encode": "Encode",
    "EndSequence": "ESequen",
    "EnvEffect": "EEffect",
    "Equiv1": "Equiv1",
    "Equiv2": "Equiv2",
    "Event Delay": "EDelay",
    "ExitWalkX": "EWX",
    "ExitWalkY": "EWY",
    "Exp": "Exp",
    "Exp(H)": "ExpH",
    "Exp(N)": "ExpN",
    "Exp/Lvl": "Exp/Lv",
    "ExpRatio": "ExpRatio",
    "Explosion": "Explsn",
    "ExplosionMissile": "EMis",
    "FCode1": "FCode1",
    "FCode2": "FCode2",
    "FCode3": "FCode3",
    "FCode4": "FCode4",
    "FCode5": "FCode5",
    "FCode6": "FCode6",
    "FCode7": "FCode7",
    "FCode8": "FCode8",
    "FMax1": "FMax1",
    "FMax2": "FMax2",
    "FMax3": "FMax3",
    "FMax4": "FMax4",
    "FMax5": "FMax5",
    "FMax6": "FMax6",
    "FMax7": "FMax7",
    "FMax8": "FMax8",
    "FMin1": "FMin1",
    "FMin2": "FMin2",
    "FMin3": "FMin3",
    "FMin4": "FMin4",
    "FMin5": "FMin5",
    "FMin6": "FMin6",
    "FMin7": "FMin7",
    "FMin8": "FMin8",
    "FParam1": "FParam1",
    "FParam2": "FParam2",
    "FParam3": "FParam3",
    "FParam4": "FParam4",
    "FParam5": "FParam5",
    "FParam6": "FParam6",
    "FParam7": "FParam7",
    "FParam8": "FParam8",
    "Fade In": "FadeIn",
    "Fade Out": "FadeOut",
    "Falloff": "Fall",
    "FaraMagicLvl": "FMLvl",
    "FaraMagicMax": "FMMax",
    "FaraMagicMin": "FMMin",
    "FaraMax": "FaraMax",
    "FaraMin": "FaraMin",
    "File": "File",
    "File 1": "File1",
    "File 10": "File10",
    "File 11": "File11",
    "File 12": "File12",
    "File 13": "File13",
    "File 14": "File14",
    "File 15": "File15",
    "File 16": "File16",
    "File 17": "File17",
    "File 18": "File18",
    "File 19": "File19",
    "File 2": "File2",
    "File 20": "File20",
    "File 21": "File21",
    "File 22": "File22",
    "File 23": "File23",
    "File 24": "File24",
    "File 25": "File25",
    "File 26": "File26",
    "File 27": "File27",
    "File 28": "File28",
    "File 29": "File29",
    "File 3": "File3",
    "File 30": "File30",
    "File 31": "File31",
    "File 32": "File32",
    "File 4": "File4",
    "File 5": "File5",
    "File 6": "File6",
    "File 7": "File7",
    "File 8": "File8",
    "File 9": "File9",
    "File1": "File1",
    "File2": "File2",
    "File3": "File3",
    "File4": "File4",
    "File5": "File5",
    "File6": "File6",
    "FileName": "FileName",
    "Filename": "File",
    "Files": "Files",
    "FillBlanks": "FBlanks",
    "Flee": "Flee",
    "Flicker": "Flicke",
    "FloorFilter": "FFilter",
    "Footstep": "Footst",
    "FootstepLayer": "FLayer",
    "FrameCnt0": "FCnt0",
    "FrameCnt1": "FCnt1",
    "FrameCnt2": "FCnt2",
    "FrameCnt3": "FCnt3",
    "FrameCnt4": "FCnt4",
    "FrameCnt5": "FCnt5",
    "FrameCnt6": "FCnt6",
    "FrameCnt7": "FCnt7",
    "FrameDelta0": "FDelta0",
    "FrameDelta1": "FDelta1",
    "FrameDelta2": "FDelta2",
    "FrameDelta3": "FDelta3",
    "FrameDelta4": "FDelta4",
    "FrameDelta5": "FDelta5",
    "FrameDelta6": "FDelta6",
    "FrameDelta7": "FDelta7",
    "FsCnt": "FsCnt",
    "FsOff": "FsOff",
    "FsPrb": "FsPrb",
    "Function": "Func",
    "GambleRare": "GRare",
    "GambleSet": "GSet",
    "GambleUber": "GUber",
    "GambleUltra": "GUltra",
    "GambleUnique": "GUnique",
    "GetHit": "GetHit",
    "GheedMagicLvl": "GMLvl",
    "GheedMagicMax": "GMMax",
    "GheedMagicMin": "GMMin",
    "GheedMax": "GheedMax",
    "GheedMin": "GheedMin",
    "Gold": "Gold",
    "Gore": "Gore",
    "Green": "Green",
    "GridSize": "GridSize",
    "Group Size": "GSize",
    "Group Weight": "GWeight",
    "GroupName": "GName",
    "HD": "HD",
    "HD Day Ambience": "HDDayAmb",
    "HD Day Event": "HDEvent",
    "HD Event Delay": "HEDelay",
    "HD Material 1": "HDMat1",
    "HD Material 2": "HDMat2",
    "HD Night Ambience": "HNAmb",
    "HD Night Event": "HNEvent",
    "HDOptOut": "HDOptOut",
    "HDv": "HDv",
    "HP": "HP",
    "HP(H)": "HPH",
    "HP(N)": "HPN",
    "HP/Lvl": "HP/Lvl",
    "HalbuMagicLvl": "HMLvl",
    "HalbuMagicMax": "HMMax",
    "HalbuMagicMin": "HMMin",
    "HalbuMax": "HalbuMax",
    "HalbuMin": "HalbuMin",
    "Half2HSrc": "Half2H",
    "Handle": "Handle",
    "HasCollision0": "HasColl0",
    "HasCollision1": "HasColl1",
    "HasCollision2": "HasColl2",
    "HasCollision3": "HasColl3",
    "HasCollision4": "HasColl4",
    "HasCollision5": "HasColl5",
    "HasCollision6": "HasColl6",
    "HasCollision7": "HasColl7",
    "HealthPotionPercent": "HPPercen",
    "Height": "Height",
    "Height1": "Height1",
    "Height2": "Height2",
    "Height3": "Height3",
    "Height4": "Height4",
    "HellUpgrade": "HellUpg",
    "HiQuality": "HiQualit",
    "HiQualityDivisor": "HQDiv",
    "HireDesc": "HireDesc",
    "HireableIconCel": "HICel",
    "Hireling": "Hire",
    "HiringMaxLevelDifference": "HMLDiff",
    "Hit Class": "HitClass",
    "HitClass": "HitClass",
    "HitDelay": "HitDelay",
    "HitFlags": "HitFlags",
    "HitShift": "HitShift",
    "HitSound": "HitSound",
    "HitSubMissile1": "HSMis1",
    "HitSubMissile2": "HSMis2",
    "HitSubMissile3": "HSMis3",
    "HitSubMissile4": "HSMis4",
    "Holy": "Holy",
    "HratliMagicLvl": "HMLvl",
    "HratliMagicMax": "HMMax",
    "HratliMagicMin": "HMMin",
    "HratliMax": "HMax",
    "HratliMin": "HMin",
    "ID0": "ID0",
    "ID1": "ID1",
    "ID2": "ID2",
    "ID3": "ID3",
    "ID4": "ID4",
    "ID5": "ID5",
    "ID6": "ID6",
    "ID7": "ID7",
    "IconCel": "IconCel",
    "Id": "Id",
    "InGame": "InGame",
    "InTown": "InTown",
    "Index": "Index",
    "Indoors": "Indoor",
    "InfernoAnim": "IAnim",
    "InfernoLen": "ILen",
    "InfernoRollback": "IRollba",
    "InheritEnvrionment": "IEnvrio",
    "Init": "Init",
    "InitFn": "InitFn",
    "InitRadius": "IRadius",
    "InitSteps": "ISteps",
    "Intensity": "Intens",
    "InvGfx1": "InvGfx1",
    "InvGfx2": "InvGfx2",
    "InvGfx3": "InvGfx3",
    "InvGfx4": "InvGfx4",
    "InvGfx5": "InvGfx5",
    "InvGfx6": "InvGfx6",
    "InvTrans": "InvTrans",
    "Is2D": "Is2D",
    "IsAmbientEvent": "IAEvent",
    "IsAmbientScene": "IAScene",
    "IsAttackable0": "IsAtt0",
    "IsDoor": "IsDoor",
    "IsLocal": "IsLocal",
    "IsMusic": "IsMusic",
    "IsUI": "IsUI",
    "Item1": "Item1",
    "Item10": "Item10",
    "Item2": "Item2",
    "Item3": "Item3",
    "Item4": "Item4",
    "Item5": "Item5",
    "Item6": "Item6",
    "Item7": "Item7",
    "Item8": "Item8",
    "Item9": "Item9",
    "ItemCastOverlay": "ICOvl",
    "ItemCastSound": "ICSound",
    "ItemCheckStart": "ICStart",
    "ItemCltCheckStart": "ICCStart",
    "ItemCltEffect": "ICEffect",
    "ItemEffect": "IEffect",
    "ItemTarget": "ITarget",
    "ItemTgtDo": "ITDo",
    "ItemType": "ItemType",
    "ItemUseRestrict": "IURestri",
    "JamellaMagicLvl": "JMLvl",
    "JamellaMagicMax": "JMMax",
    "JamellaMagicMin": "JMMin",
    "JamellaMax": "JMax",
    "JamellaMin": "JMin",
    "KeepCursorStateOnKill": "KCSOKill",
    "Kick": "Kick",
    "KillEdge": "KillEdge",
    "KnockBack": "KBack",
    "L-AC": "LAC",
    "L-AC(H)": "LACH",
    "L-AC(N)": "LACN",
    "L-DM": "LDM",
    "L-DM(H)": "LDMH",
    "L-DM(N)": "LDMN",
    "L-HP": "LHP",
    "L-HP(H)": "LHPH",
    "L-HP(N)": "LHPN",
    "L-TH": "LTH",
    "L-TH(H)": "LTHH",
    "L-TH(N)": "LTHN",
    "L-XP": "LXP",
    "L-XP(H)": "LXPH",
    "L-XP(N)": "LXPN",
    "LA": "LA",
    "LFEMix": "LFEMix",
    "LG": "LG",
    "LGv": "LGv",
    "LH": "LH",
    "LHv": "LHv",
    "LOSDraw": "LOSDra",
    "LarzukMagicLvl": "LMLvl",
    "LarzukMagicMax": "LMMax",
    "LarzukMagicMin": "LMMin",
    "LarzukMax": "LMax",
    "LarzukMin": "LMin",
    "LastCollide": "LCollid",
    "Lav": "Lav",
    "Layer": "Layer",
    "Left": "Left",
    "Legs": "Legs",
    "LevRange": "LevRange",
    "LevToHit": "LevToHit",
    "Level": "Level",
    "Level(H)": "LevelH",
    "Level(N)": "LevelN",
    "Level1": "Level1",
    "Level2": "Level2",
    "Level3": "Level3",
    "Level4": "Level4",
    "Level5": "Level5",
    "Level6": "Level6",
    "LevelEntry": "LEntry",
    "LevelGroup": "LGroup",
    "LevelId": "LevelId",
    "LevelMin": "LevelMin",
    "LevelName": "LName",
    "LevelType": "LType",
    "LevelWarp": "LWarp",
    "LifePerLevel": "LPLevel",
    "LifePerVitality": "LPVit",
    "LifeStealDivisor": "LSDiv",
    "Light": "Light",
    "LightRadius": "LRadius",
    "LineOfSight": "LOSight",
    "ListRow": "ListRow",
    "Lit0": "Lit0",
    "Lit1": "Lit1",
    "Lit2": "Lit2",
    "Lit3": "Lit3",
    "Lit4": "Lit4",
    "Lit5": "Lit5",
    "Lit6": "Lit6",
    "Lit7": "Lit7",
    "LitVersion": "LVersio",
    "LocalBlood": "LBlood",
    "Lockable": "Lock",
    "Logicals": "Logica",
    "Loop": "Loop",
    "LoopAnim": "LoopAnim",
    "LoopWaitTime": "LWTime",
    "LvlPerLvl1": "LPLvl1",
    "LvlPerLvl2": "LPLvl2",
    "LvlPerLvl3": "LPLvl3",
    "LvlPerLvl4": "LPLvl4",
    "LvlPerLvl5": "LPLvl5",
    "LvlPerLvl6": "LPLvl6",
    "LysanderMagicLvl": "LMLvl",
    "LysanderMagicMax": "LMMax",
    "LysanderMagicMin": "LMMin",
    "LysanderMax": "LMax",
    "LysanderMin": "LMin",
    "Magic": "Magic",
    "MagicDivisor": "MagicDiv",
    "MagicMin": "MagicMin",
    "MalahMagicLvl": "MMLvl",
    "MalahMagicMax": "MMMax",
    "MalahMagicMin": "MMMin",
    "MalahMax": "MalahMax",
    "MalahMin": "MalahMin",
    "ManaPerLevel": "MPLevel",
    "ManaPerMagic": "MPMagic",
    "ManaPotionPercent": "MPPercen",
    "ManaRegen": "MRegen",
    "ManaStealDivisor": "MSDiv",
    "Material 1": "Mat1",
    "Material 2": "Mat2",
    "Max0": "Max0",
    "Max1": "Max1",
    "Max2": "Max2",
    "Max3": "Max3",
    "Max4": "Max4",
    "MaxDam": "MaxDam",
    "MaxDamage": "MDamage",
    "MaxELev1": "MaxELev1",
    "MaxELev2": "MaxELev2",
    "MaxELev3": "MaxELev3",
    "MaxELev4": "MaxELev4",
    "MaxELev5": "MaxELev5",
    "MaxGrp": "MaxGrp",
    "MaxHP(H)": "MaxHPH",
    "MaxHP(N)": "MaxHPN",
    "MaxLevDam1": "MLDam1",
    "MaxLevDam2": "MLDam2",
    "MaxLevDam3": "MLDam3",
    "MaxLevDam4": "MLDam4",
    "MaxLevDam5": "MLDam5",
    "MaxSockets1": "MSocket1",
    "MaxSockets2": "MSocket2",
    "MaxSockets3": "MSocket3",
    "MaxSocketsLevelThreshold1": "MSLThres",
    "MaxSocketsLevelThreshold2": "MSLThres",
    "MaxVel": "MaxVel",
    "MeleeRng": "MeleeRng",
    "MercenaryDamagePercentVSBoss": "MDPVSBos",
    "MercenaryDamagePercentVSMercenary": "MDPVSMer",
    "MercenaryDamagePercentVSPlayer": "MDPVSPla",
    "MercenaryMaxStunLength": "MMSLengt",
    "Merge": "Merge",
    "MinAccr": "MinAccr",
    "MinDam": "MinDam",
    "MinDamage": "MDamage",
    "MinELev1": "MinELev1",
    "MinELev2": "MinELev2",
    "MinELev3": "MinELev3",
    "MinELev4": "MinELev4",
    "MinELev5": "MinELev5",
    "MinGrp": "MinGrp",
    "MinHP(H)": "MinHPH",
    "MinHP(N)": "MinHPN",
    "MinLevDam1": "MLDam1",
    "MinLevDam2": "MLDam2",
    "MinLevDam3": "MLDam3",
    "MinLevDam4": "MLDam4",
    "MinLevDam5": "MLDam5",
    "MinimumCastingDelay": "MCDelay",
    "MissA1": "MissA1",
    "MissA2": "MissA2",
    "MissC": "MissC",
    "MissS1": "MissS1",
    "MissS2": "MissS2",
    "MissS3": "MissS3",
    "MissS4": "MissS4",
    "MissSQ": "MissSQ",
    "Missile": "Mis",
    "MissileSkill": "MisSkill",
    "Mod1": "Mod1",
    "Mod2": "Mod2",
    "Mod3": "Mod3",
    "Mode0": "Mode0",
    "Mode1": "Mode1",
    "Mode2": "Mode2",
    "Mode3": "Mode3",
    "Mode4": "Mode4",
    "Mode5": "Mode5",
    "Mode6": "Mode6",
    "Mode7": "Mode7",
    "MonDen": "MonDen",
    "MonDen(H)": "MonDenH",
    "MonDen(N)": "MonDenN",
    "MonLvl": "MonLvl",
    "MonLvl(H)": "MonLvlH",
    "MonLvl(N)": "MonLvlN",
    "MonLvlEx": "MonLvlEx",
    "MonLvlEx(H)": "MLEH",
    "MonLvlEx(N)": "MLEN",
    "MonProp": "MonProp",
    "MonSound": "MonSound",
    "MonSpcWalk": "MSWalk",
    "MonStatsEx": "MSEx",
    "MonType": "MonType",
    "MonUMax": "MonUMax",
    "MonUMax(H)": "MonUMaxH",
    "MonUMax(N)": "MonUMaxN",
    "MonUMin": "MonUMin",
    "MonUMin(H)": "MonUMinH",
    "MonUMin(N)": "MonUMinN",
    "MonWndr": "MonWndr",
    "MonsterCEDamagePercent": "MCPercen",
    "MonsterColdDivisor": "MCDiv",
    "MonsterFireEnchantExplosionDamagePercent": "MFEEDPer",
    "MonsterFreezeDivisor": "MFDiv",
    "MonsterOK": "MonOK",
    "MonsterSkillBonus": "MSBonus",
    "Mud": "Mud",
    "Multiply": "Multip",
    "Music Vol": "MusicVol",
    "Name": "Name",
    "NameFirst": "NFirst",
    "NameLast": "NameLast",
    "NameOffset": "NOffset",
    "NameStr": "NameStr",
    "Nameable": "Nameab",
    "Necromancer": "Necrom",
    "NeuTime": "NeuTime",
    "Neutral": "Neutra",
    "NextDelay": "NDelay",
    "NextHit": "NextHit",
    "NextInClass": "NIClass",
    "Night Ambience": "NightAmb",
    "Night Event": "NEvent",
    "NightmareUpgrade": "NMUpg",
    "NoDrop": "NoDrop",
    "NoInteract": "NoIntera",
    "NoMultiShot": "NMShot",
    "NoPer": "NoPer",
    "NoUniqueMod": "NUMod",
    "Normal": "Normal",
    "NormalDivisor": "NDiv",
    "NumDirections": "NDrctns",
    "NumMon": "NumMon",
    "ObjGrp0": "ObjGrp0",
    "ObjGrp1": "ObjGrp1",
    "ObjGrp2": "ObjGrp2",
    "ObjGrp3": "ObjGrp3",
    "ObjGrp4": "ObjGrp4",
    "ObjGrp5": "ObjGrp5",
    "ObjGrp6": "ObjGrp6",
    "ObjGrp7": "ObjGrp7",
    "ObjPrb0": "ObjPrb0",
    "ObjPrb1": "ObjPrb1",
    "ObjPrb2": "ObjPrb2",
    "ObjPrb3": "ObjPrb3",
    "ObjPrb4": "ObjPrb4",
    "ObjPrb5": "ObjPrb5",
    "ObjPrb6": "ObjPrb6",
    "ObjPrb7": "ObjPrb7",
    "ObjectClass": "OClass",
    "OffsetX": "OffsetX",
    "OffsetY": "OffsetY",
    "OpenWarp": "OpenWarp",
    "OperateFn": "OpFn",
    "OrderFlag0": "OFlag0",
    "OrderFlag1": "OFlag1",
    "OrderFlag2": "OFlag2",
    "OrderFlag3": "OFlag3",
    "OrderFlag4": "OFlag4",
    "OrderFlag5": "OFlag5",
    "OrderFlag6": "OFlag6",
    "OrderFlag7": "OFlag7",
    "Orientation": "Orient",
    "OrmusMagicLvl": "OMLvl",
    "OrmusMagicMax": "OMMax",
    "OrmusMagicMin": "OMMin",
    "OrmusMax": "OrmusMax",
    "OrmusMin": "OrmusMin",
    "Outdoors": "Outdoo",
    "Overlay": "Ovl",
    "OverlayHeight": "OHeight",
    "PCode2a": "PCode2",
    "PCode2b": "PCode2",
    "PCode3a": "PCode3",
    "PCode3b": "PCode3",
    "PCode4a": "PCode4",
    "PCode4b": "PCode4",
    "PCode5a": "PCode5",
    "PCode5b": "PCode5",
    "PMax2a": "PMax2a",
    "PMax2b": "PMax2b",
    "PMax3a": "PMax3a",
    "PMax3b": "PMax3b",
    "PMax4a": "PMax4a",
    "PMax4b": "PMax4b",
    "PMax5a": "PMax5a",
    "PMax5b": "PMax5b",
    "PMin2a": "PMin2a",
    "PMin2b": "PMin2b",
    "PMin3a": "PMin3a",
    "PMin3b": "PMin3b",
    "PMin4a": "PMin4a",
    "PMin4b": "PMin4b",
    "PMin5a": "PMin5a",
    "PMin5b": "PMin5b",
    "PParam2a": "PParam",
    "PParam2b": "PParam",
    "PParam3a": "PParam",
    "PParam3b": "PParam",
    "PParam4a": "PParam",
    "PParam4b": "PParam",
    "PParam5a": "PParam",
    "PParam5b": "PParam",
    "PROB0": "PROB0",
    "PROB1": "PROB1",
    "PROB2": "PROB2",
    "PROB3": "PROB3",
    "PROB4": "PROB4",
    "PROB5": "PROB5",
    "PROB6": "PROB6",
    "PROB7": "PROB7",
    "Pal": "Pal",
    "Paladin": "Paladi",
    "Param1": "Param1",
    "Param10": "Param10",
    "Param11": "Param11",
    "Param12": "Param12",
    "Param2": "Param2",
    "Param3": "Param3",
    "Param4": "Param4",
    "Param5": "Param5",
    "Param6": "Param6",
    "Param7": "Param7",
    "Param8": "Param8",
    "Param9": "Param9",
    "Parm0": "Parm0",
    "Parm1": "Parm1",
    "Parm2": "Parm2",
    "Parm3": "Parm3",
    "Parm4": "Parm4",
    "PartyMax": "PartyMax",
    "PartyMin": "PartyMin",
    "PermStoreItem": "PSItem",
    "PetDamagePercentVSPlayer": "PDPVSPla",
    "Picks": "Picks",
    "Pierce": "Pierce",
    "Pitch Max": "PitchMax",
    "Pitch Min": "PitchMin",
    "Place": "Place",
    "Player Class": "PClass",
    "PlayerDamagePercentVSMercenary": "PDPVSMer",
    "PlayerDamagePercentVSPlayer": "PDPVSPla",
    "PlayerDamagePercentVSPrimeEvil": "PDPVEvil",
    "PlayerHitReactBufferVSMonster": "PHRBVSMo",
    "PlayerHitReactBufferVSPlayer": "PHRBVSPl",
    "PopPad": "PopPad",
    "Pops": "Pops",
    "Populate": "Pop",
    "PopulateFn": "PopFn",
    "Portal": "Portal",
    "Position": "Pos",
    "PreDraw": "PreDraw",
    "PreOperate": "PreOp",
    "PrimeEvilDamagePercentVSMercenary": "PEDPVSMe",
    "PrimeEvilDamagePercentVSPet": "PEDPVSPe",
    "PrimeEvilDamagePercentVSPlayer": "PEDPVSPl",
    "Priority": "Prio",
    "Prob0": "Prob0",
    "Prob1": "Prob1",
    "Prob10": "Prob10",
    "Prob2": "Prob2",
    "Prob3": "Prob3",
    "Prob4": "Prob4",
    "Prob5": "Prob5",
    "Prob6": "Prob6",
    "Prob7": "Prob7",
    "Prob8": "Prob8",
    "Prob9": "Prob9",
    "ProgOverlay": "ProgOvl",
    "ProgSound": "PSound",
    "Quest": "Quest",
    "QuestFlag": "QFlag",
    "QuestFlagEx": "QFEx",
    "Quiver": "Quiver",
    "RA": "RA",
    "RH": "RH",
    "RHv": "RHv",
    "Radius": "Radius",
    "Rain": "Rain",
    "RandStart": "RStart",
    "Range": "Range",
    "Rare": "Rare",
    "RareDivisor": "RareDiv",
    "RareMin": "RareMin",
    "Rarity": "Rarity",
    "Rav": "Rav",
    "ReEquip": "ReEquip",
    "Red": "Red",
    "Redirect": "Redir",
    "Reload": "Reload",
    "Repair": "Repair",
    "Replaceable": "Replac",
    "ResCo": "ResCo",
    "ResCo(H)": "ResCoH",
    "ResCo(N)": "ResCoN",
    "ResDm": "ResDm",
    "ResDm(H)": "ResDmH",
    "ResDm(N)": "ResDmN",
    "ResFi": "ResFi",
    "ResFi(H)": "ResFiH",
    "ResFi(N)": "ResFiN",
    "ResLi": "ResLi",
    "ResLi(H)": "ResLiH",
    "ResLi(N)": "ResLiN",
    "ResMa": "ResMa",
    "ResMa(H)": "ResMaH",
    "ResMa(N)": "ResMaN",
    "ResPo": "ResPo",
    "ResPo(H)": "ResPoH",
    "ResPo(N)": "ResPoN",
    "ResistCold": "RCold",
    "ResistCold/Lvl": "RCold/L",
    "ResistFire": "RFire",
    "ResistFire/Lvl": "RFire/L",
    "ResistLightning": "RLight",
    "ResistLightning/Lvl": "RLightn",
    "ResistPenalty": "RPenalt",
    "ResistPenaltyNonExpansion": "RPNExpns",
    "ResistPoison": "RPoison",
    "ResistPoison/Lvl": "RPoison",
    "Restore": "Rest",
    "RestoreVirgins": "RVirgin",
    "ResultFlags": "RFlags",
    "ResurrectMode": "ResMode",
    "ResurrectSkill": "ResSkill",
    "ReturnFire": "RFire",
    "Rooms": "Rooms",
    "Rooms(H)": "RoomsH",
    "Rooms(N)": "RoomsN",
    "Run": "Run",
    "RunDrain": "RunDrain",
    "RunVelocity": "RunVel",
    "Rune1": "Rune1",
    "Rune2": "Rune2",
    "Rune3": "Rune3",
    "Rune4": "Rune4",
    "Rune5": "Rune5",
    "Rune6": "Rune6",
    "S1": "S1",
    "S1MaxD": "S1MaxD",
    "S1MaxD(H)": "S1MaxDH",
    "S1MaxD(N)": "S1MaxDN",
    "S1MinD": "S1MinD",
    "S1MinD(H)": "S1MinDH",
    "S1MinD(N)": "S1MinDN",
    "S1TH": "S1TH",
    "S1TH(H)": "S1THH",
    "S1TH(N)": "S1THN",
    "S1mv": "S1mv",
    "S1v": "S1v",
    "S2": "S2",
    "S2mv": "S2mv",
    "S2v": "S2v",
    "S3": "S3",
    "S3mv": "S3mv",
    "S3v": "S3v",
    "S4": "S4",
    "S4mv": "S4mv",
    "S4v": "S4v",
    "S5": "S5",
    "S5v": "S5v",
    "S6": "S6",
    "S6v": "S6v",
    "S7": "S7",
    "S7v": "S7v",
    "S8": "S8",
    "S8v": "S8v",
    "SCmv": "SCmv",
    "SFX EAX Decay HF": "SEDHF",
    "SFX EAX Decay Time": "SEDTime",
    "SFX EAX Environ": "SEEnv",
    "SFX EAX Reflect": "SERefl",
    "SFX EAX Reflect Delay": "SERDelay",
    "SFX EAX Rev Delay": "SERDelay",
    "SFX EAX Reverb": "SEReverb",
    "SFX EAX Room HF": "SERHF",
    "SFX EAX Room Vol": "SERVol",
    "SH": "SH",
    "SHitCalc1": "SCalc1",
    "SHv": "SHv",
    "Save Add": "SaveAdd",
    "Save Bits": "SaveBits",
    "Save Param Bits": "SPBits",
    "SaveMonsters": "SMonste",
    "Saved": "Saved",
    "Scan": "Scan",
    "ScrollSkill": "SSkill",
    "ScrollSpellCode": "SSCode",
    "SearchEnemyNear": "SENear",
    "SearchEnemyXY": "SEXY",
    "SearchOpenXY": "SOXY",
    "SelectDX": "SelectDX",
    "SelectDY": "SelectDY",
    "SelectProc": "SProc",
    "SelectX": "SelectX",
    "SelectY": "SelectY",
    "Selectable0": "Sel0",
    "Selectable1": "Sel1",
    "Selectable2": "Sel2",
    "Selectable3": "Sel3",
    "Selectable4": "Sel4",
    "Selectable5": "Sel5",
    "Selectable6": "Sel6",
    "Selectable7": "Sel7",
    "Seller": "Seller",
    "Send Bits": "SendBits",
    "Send Other": "SOther",
    "Send Param Bits": "SPBits",
    "SendSkills": "SSkills",
    "Set": "Set",
    "SetBoss": "SetBoss",
    "SetDivisor": "SetDiv",
    "SetMin": "SetMin",
    "Shadow": "Shadow",
    "ShieldBlockOverride": "SBOverri",
    "Shoots": "Shoots",
    "ShowLevel": "SLevel",
    "ShrineFunction": "SFunc",
    "Signed": "Signed",
    "Size": "Size",
    "SizeX": "SizeX",
    "SizeX(H)": "SizeXH",
    "SizeX(N)": "SizeXN",
    "SizeY": "SizeY",
    "SizeY(H)": "SizeYH",
    "SizeY(N)": "SizeYN",
    "Sk1lvl": "Sk1lvl",
    "Sk1mode": "Sk1mod",
    "Sk2lvl": "Sk2lvl",
    "Sk2mode": "Sk2mod",
    "Sk3lvl": "Sk3lvl",
    "Sk3mode": "Sk3mod",
    "Sk4lvl": "Sk4lvl",
    "Sk4mode": "Sk4mod",
    "Sk5lvl": "Sk5lvl",
    "Sk5mode": "Sk5mod",
    "Sk6lvl": "Sk6lvl",
    "Sk6mode": "Sk6mod",
    "Sk7lvl": "Sk7lvl",
    "Sk7mode": "Sk7mod",
    "Sk8lvl": "Sk8lvl",
    "Sk8mode": "Sk8mod",
    "Skill": "Skill",
    "Skill 1": "Skill1",
    "Skill 10": "Skill10",
    "Skill 2": "Skill2",
    "Skill 3": "Skill3",
    "Skill 4": "Skill4",
    "Skill 5": "Skill5",
    "Skill 6": "Skill6",
    "Skill 7": "Skill7",
    "Skill 8": "Skill8",
    "Skill 9": "Skill9",
    "Skill1": "Skill1",
    "Skill2": "Skill2",
    "Skill3": "Skill3",
    "Skill4": "Skill4",
    "Skill5": "Skill5",
    "Skill6": "Skill6",
    "Skill7": "Skill7",
    "Skill8": "Skill8",
    "SkillColumn": "SColumn",
    "SkillDamage": "SDamage",
    "SkillPage": "SPage",
    "SkillRow": "SkillRow",
    "SkillsPerLevel": "SPLevel",
    "SkipName": "SkipName",
    "SoftHit": "SoftHit",
    "Solo": "Solo",
    "Song": "Song",
    "Sorceress": "Srcrss",
    "Sound": "Sound",
    "SoundEnv": "SoundEnv",
    "SpawnUniqueMod": "SUMod",
    "SpellIcon": "SIcon",
    "SplClientEnd": "SCEnd",
    "SplEndDeath": "SEDeath",
    "SplEndGeneric": "SEGeneri",
    "SplGetModeChart": "SGMChart",
    "SrcDam": "SrcDam",
    "SrcDamage": "SDamage",
    "SrcMissDmg": "SMDmg",
    "SrcTown": "SrcTown",
    "SrvCalc1": "SrvCalc1",
    "Stacks": "Stacks",
    "StaffMods": "SMods",
    "StaminaPerLevel": "SPLevel",
    "StaminaPerVitality": "SPVit",
    "Start0": "Start0",
    "Start1": "Start1",
    "Start2": "Start2",
    "Start3": "Start3",
    "Start4": "Start4",
    "Start5": "Start5",
    "Start6": "Start6",
    "Start7": "Start7",
    "StartSequence": "SSequen",
    "StartSkill": "SSkill",
    "Stat": "Stat",
    "StatPerLevel": "SPLevel",
    "State1": "State1",
    "State2": "State2",
    "State3": "State3",
    "StaticFieldMin": "SFMin",
    "Stop Inst": "StopInst",
    "Store Page": "SPage",
    "StorePage": "SPage",
    "Str": "Str",
    "Str/Lvl": "Str/Lv",
    "StrAllSkills": "SASkills",
    "StrBonus": "StrBonus",
    "StrClassOnly": "SCOnly",
    "StrSkillTab1": "SSTab1",
    "StrSkillTab2": "SSTab2",
    "StrSkillTab3": "SSTab3",
    "Stream": "Stream",
    "StringName": "SName",
    "StringPhrase": "SPhrase",
    "Style": "Style",
    "SubClass": "SubClass",
    "SubLoop": "SubLoop",
    "SubMissile1": "SubMis1",
    "SubMissile2": "SubMis2",
    "SubMissile3": "SubMis3",
    "SubShrine": "SShrine",
    "SubStart": "SubStart",
    "SubStop": "SubStop",
    "SubTheme": "SubTheme",
    "SubType": "SubType",
    "SubWaypoint": "SWaypoi",
    "Superunique": "Sprnqe",
    "Sync": "Sync",
    "T1Code1": "T1Code1",
    "T1Code2": "T1Code2",
    "T1Code3": "T1Code3",
    "T1Code4": "T1Code4",
    "T1Code5": "T1Code5",
    "T1Code6": "T1Code6",
    "T1Code7": "T1Code7",
    "T1Max1": "T1Max1",
    "T1Max2": "T1Max2",
    "T1Max3": "T1Max3",
    "T1Max4": "T1Max4",
    "T1Max5": "T1Max5",
    "T1Max6": "T1Max6",
    "T1Max7": "T1Max7",
    "T1Min1": "T1Min1",
    "T1Min2": "T1Min2",
    "T1Min3": "T1Min3",
    "T1Min4": "T1Min4",
    "T1Min5": "T1Min5",
    "T1Min6": "T1Min6",
    "T1Min7": "T1Min7",
    "T1Param1": "T1Para1",
    "T1Param2": "T1Para2",
    "T1Param3": "T1Para3",
    "T1Param4": "T1Para4",
    "T1Param5": "T1Para5",
    "T1Param6": "T1Para6",
    "T1Param7": "T1Para7",
    "TC": "TC",
    "TC Desecrated": "TCDsec",
    "TC(H)": "TCH",
    "TC(H) Desecrated": "TCHDsec",
    "TC(N)": "TCN",
    "TC(N) Desecrated": "TCNDsec",
    "TCQuestCP": "TCQuesCP",
    "TCQuestId": "TCQuesId",
    "TH": "TH",
    "TH(H)": "THH",
    "TH(N)": "THN",
    "TMogMax": "TMogMax",
    "TMogMin": "TMogMin",
    "TMogType": "TMogType",
    "TR": "TR",
    "TRv": "TRv",
    "TargetAlly": "TAlly",
    "TargetCorpse": "TCorpse",
    "TargetItem": "TItem",
    "TargetPet": "TPet",
    "TargetableOnly": "TOnly",
    "Taunt": "Taunt",
    "Teleport": "Telepo",
    "TgtPlaceCheck": "TPCheck",
    "Themes": "Themes",
    "Throwable": "Throwa",
    "TileName": "TileName",
    "Tiles": "Tiles",
    "ToBlock": "ToBlock",
    "ToBlock(H)": "ToBlockH",
    "ToBlock(N)": "ToBlockN",
    "ToHit": "ToHit",
    "ToHitCalc": "THCalc",
    "ToHitFactor": "THFactor",
    "Token": "Token",
    "Top": "Top",
    "Torso": "Torso",
    "TotalPieces": "TPieces",
    "Town": "Town",
    "Tracking": "Track",
    "Trans": "Trans",
    "TransLvl": "TransLvl",
    "Transform": "Trans",
    "Transform Color": "TColor",
    "Transmogrify": "Transm",
    "TravelSound": "TSound",
    "Treasure Class": "TClass",
    "TreasureClass": "TClass",
    "TreasureClass(H)": "TCH",
    "TreasureClass(N)": "TCN",
    "TreasureClassChamp": "TCChamp",
    "TreasureClassChamp(H)": "TCCH",
    "TreasureClassChamp(N)": "TCCN",
    "TreasureClassDesecrated": "TCDsec",
    "TreasureClassDesecrated(H)": "TCDH",
    "TreasureClassDesecrated(N)": "TCDN",
    "TreasureClassDesecratedChamp": "TCDChamp",
    "TreasureClassDesecratedChamp(H)": "TCDCH",
    "TreasureClassDesecratedChamp(N)": "TCDCN",
    "TreasureClassDesecratedUnique": "TCDUniqu",
    "TreasureClassDesecratedUnique(H)": "TCDUH",
    "TreasureClassDesecratedUnique(N)": "TCDUN",
    "TreasureClassQuest": "TCQuest",
    "TreasureClassQuest(H)": "TCQH",
    "TreasureClassQuest(N)": "TCQN",
    "TreasureClassUnique": "TCUnique",
    "TreasureClassUnique(H)": "TCUH",
    "TreasureClassUnique(N)": "TCUN",
    "Trials0": "Trials0",
    "Trials1": "Trials1",
    "Trials2": "Trials2",
    "Trials3": "Trials3",
    "Trials4": "Trials4",
    "Type": "Type",
    "UMonSound": "USound",
    "Uber": "Uber",
    "Unique": "Unique",
    "UniqueDamageBonus": "UDBonus",
    "UniqueDivisor": "UDiv",
    "UniqueId": "UniqueId",
    "UniqueMin": "UMin",
    "UpdateAnimRate": "UARate",
    "UseAttackRate": "UARate",
    "Utrans": "Utrans",
    "Utrans(H)": "UtransH",
    "Utrans(N)": "UtransN",
    "VOX EAX Decay HF": "VEDHF",
    "VOX EAX Decay Time": "VEDTime",
    "VOX EAX Environ": "VEEnv",
    "VOX EAX Reflect": "VERefl",
    "VOX EAX Reflect Delay": "VERDelay",
    "VOX EAX Rev Delay": "VERDelay",
    "VOX EAX Reverb": "VEReverb",
    "VOX EAX Room HF": "VERHF",
    "VOX EAX Room Vol": "VERVol",
    "ValShift": "ValShift",
    "VarInvGfx": "VIGfx",
    "Vel": "Vel",
    "VelLev": "VelLev",
    "Velocity": "Vel",
    "Version": "Versio",
    "Vis0": "Vis0",
    "Vis1": "Vis1",
    "Vis2": "Vis2",
    "Vis3": "Vis3",
    "Vis4": "Vis4",
    "Vis5": "Vis5",
    "Vis6": "Vis6",
    "Vis7": "Vis7",
    "Volume Max": "VMax",
    "Volume Min": "VMin",
    "WalkVelocity": "WalkVel",
    "Warp0": "Warp0",
    "Warp1": "Warp1",
    "Warp2": "Warp2",
    "Warp3": "Warp3",
    "Warp4": "Warp4",
    "Warp5": "Warp5",
    "Warp6": "Warp6",
    "Warp7": "Warp7",
    "WarpDist": "WarpDist",
    "Waypoint": "Waypoi",
    "Wea1Del": "Wea1De",
    "Wea1Vol": "Wea1Vo",
    "Wea2Del": "Wea2De",
    "Wea2Vol": "Wea2Vo",
    "Weapon1": "Weapon1",
    "Weapon2": "Weapon2",
    "Width": "Width",
    "XP": "XP",
    "XP(H)": "XPH",
    "XP(N)": "XPN",
    "Xoffset": "Xoffse",
    "Xspace": "Xspace",
    "Yoffset": "Yoffse",
    "Yspace": "Yspace",
    "act": "act",
    "active": "active",
    "add": "add",
    "add func": "addfunc",
    "advdisplay": "advdis",
    "aibonus": "aibonu",
    "aidel": "aidel",
    "aidel(H)": "aidelH",
    "aidel(N)": "aidelN",
    "aidist": "aidist",
    "aidist(H)": "aidistH",
    "aidist(N)": "aidistN",
    "aip1": "aip1",
    "aip1(H)": "aip1H",
    "aip1(N)": "aip1N",
    "aip2": "aip2",
    "aip2(H)": "aip2H",
    "aip2(N)": "aip2N",
    "aip3": "aip3",
    "aip3(H)": "aip3H",
    "aip3(N)": "aip3N",
    "aip4": "aip4",
    "aip4(H)": "aip4H",
    "aip4(N)": "aip4N",
    "aip5": "aip5",
    "aip5(H)": "aip5H",
    "aip5(N)": "aip5N",
    "aip6": "aip6",
    "aip6(H)": "aip6H",
    "aip6(N)": "aip6N",
    "aip7": "aip7",
    "aip7(H)": "aip7H",
    "aip7(N)": "aip7N",
    "aip8": "aip8",
    "aip8(H)": "aip8H",
    "aip8(N)": "aip8N",
    "aitype": "aitype",
    "alSel": "alSel",
    "alternateVoice": "aVoice",
    "alternategfx": "altern",
    "alwayshit": "always",
    "amax1a": "amax1a",
    "amax1b": "amax1b",
    "amax2a": "amax2a",
    "amax2b": "amax2b",
    "amax3a": "amax3a",
    "amax3b": "amax3b",
    "amax4a": "amax4a",
    "amax4b": "amax4b",
    "amax5a": "amax5a",
    "amax5b": "amax5b",
    "amin1a": "amin1a",
    "amin1b": "amin1b",
    "amin2a": "amin2a",
    "amin2b": "amin2b",
    "amin3a": "amin3a",
    "amin3b": "amin3b",
    "amin4a": "amin4a",
    "amin4b": "amin4b",
    "amin5a": "amin5a",
    "amin5b": "amin5b",
    "anim": "anim",
    "animrate": "animra",
    "apar1a": "apar1a",
    "apar1b": "apar1b",
    "apar2a": "apar2a",
    "apar2b": "apar2b",
    "apar3a": "apar3a",
    "apar3b": "apar3b",
    "apar4a": "apar4a",
    "apar4b": "apar4b",
    "apar5a": "apar5a",
    "apar5b": "apar5b",
    "aprop1a": "aprop1",
    "aprop1b": "aprop1",
    "aprop2a": "aprop2",
    "aprop2b": "aprop2",
    "aprop3a": "aprop3",
    "aprop3b": "aprop3",
    "aprop4a": "aprop4",
    "aprop4b": "aprop4",
    "aprop5a": "aprop5",
    "aprop5b": "aprop5",
    "armblue": "armblu",
    "armor": "armor",
    "armred": "armred",
    "attackrank": "attack",
    "attblue": "attblu",
    "attred": "attred",
    "aura": "aura",
    "auraevent1": "arvnt1",
    "auraevent2": "arvnt2",
    "auraevent3": "arvnt3",
    "auraeventfunc1": "auraev1",
    "auraeventfunc2": "auraev2",
    "auraeventfunc3": "auraev3",
    "aurafilter": "arfltr",
    "auralencalc": "aurale",
    "aurarangecalc": "aurara",
    "aurastat1": "aurast1",
    "aurastat2": "aurast2",
    "aurastat3": "aurast3",
    "aurastat4": "aurast4",
    "aurastat5": "aurast5",
    "aurastat6": "aurast6",
    "aurastatcalc1": "aurast1",
    "aurastatcalc2": "aurast2",
    "aurastatcalc3": "aurast3",
    "aurastatcalc4": "aurast4",
    "aurastatcalc5": "aurast5",
    "aurastatcalc6": "aurast6",
    "aurastate": "arstte",
    "auratargetstate": "aurata",
    "auto prefix": "aprefix",
    "autobelt": "autobe",
    "automap": "Map",
    "automapCel": "MapCel",
    "b ilvl": "bilvl",
    "b lvl": "blvl",
    "b mod 1": "bmod1",
    "b mod 1 chance": "bm1chanc",
    "b mod 1 max": "bmod1max",
    "b mod 1 min": "bmod1min",
    "b mod 1 param": "bm1param",
    "b mod 2": "bmod2",
    "b mod 2 chance": "bm2chanc",
    "b mod 2 max": "bmod2max",
    "b mod 2 min": "bmod2min",
    "b mod 2 param": "bm2param",
    "b mod 3": "bmod3",
    "b mod 3 chance": "bm3chanc",
    "b mod 3 max": "bmod3max",
    "b mod 3 min": "bmod3min",
    "b mod 3 param": "bm3param",
    "b mod 4": "bmod4",
    "b mod 4 chance": "bm4chanc",
    "b mod 4 max": "bmod4max",
    "b mod 4 min": "bmod4min",
    "b mod 4 param": "bm4param",
    "b mod 5": "bmod5",
    "b mod 5 chance": "bm5chanc",
    "b mod 5 max": "bmod5max",
    "b mod 5 min": "bmod5min",
    "b mod 5 param": "bm5param",
    "b plvl": "bplvl",
    "baseWClass": "bWClass",
    "baseicon": "baseic",
    "basemax": "basema",
    "belt": "belt",
    "beltBottom": "bBottom",
    "beltHeight": "bHeight",
    "beltLeft": "beltLeft",
    "beltRight": "bRight",
    "beltTop": "beltTop",
    "beltWidth": "bWidth",
    "bitfield1": "bitfie1",
    "block": "block",
    "boots": "boots",
    "boss": "boss",
    "bossinv": "bossin",
    "bossstaydeath": "bossst",
    "bow": "bow",
    "box10bottom": "box10b",
    "box10left": "box10l",
    "box10right": "box10r",
    "box10top": "box10t",
    "box11bottom": "box11b",
    "box11left": "box11l",
    "box11right": "box11r",
    "box11top": "box11t",
    "box12bottom": "box12b",
    "box12left": "box12l",
    "box12right": "box12r",
    "box12top": "box12t",
    "box13bottom": "box13b",
    "box13left": "box13l",
    "box13right": "box13r",
    "box13top": "box13t",
    "box14bottom": "box14b",
    "box14left": "box14l",
    "box14right": "box14r",
    "box14top": "box14t",
    "box15bottom": "box15b",
    "box15left": "box15l",
    "box15right": "box15r",
    "box15top": "box15t",
    "box16bottom": "box16b",
    "box16left": "box16l",
    "box16right": "box16r",
    "box16top": "box16t",
    "box1bottom": "box1bo",
    "box1left": "box1le",
    "box1right": "box1ri",
    "box1top": "box1to",
    "box2bottom": "box2bo",
    "box2left": "box2le",
    "box2right": "box2ri",
    "box2top": "box2to",
    "box3bottom": "box3bo",
    "box3left": "box3le",
    "box3right": "box3ri",
    "box3top": "box3to",
    "box4bottom": "box4bo",
    "box4left": "box4le",
    "box4right": "box4ri",
    "box4top": "box4to",
    "box5bottom": "box5bo",
    "box5left": "box5le",
    "box5right": "box5ri",
    "box5top": "box5to",
    "box6bottom": "box6bo",
    "box6left": "box6le",
    "box6right": "box6ri",
    "box6top": "box6to",
    "box7bottom": "box7bo",
    "box7left": "box7le",
    "box7right": "box7ri",
    "box7top": "box7to",
    "box8bottom": "box8bo",
    "box8left": "box8le",
    "box8right": "box8ri",
    "box8top": "box8to",
    "box9bottom": "box9bo",
    "box9left": "box9le",
    "box9right": "box9ri",
    "box9top": "box9to",
    "buy mult": "buymult",
    "c ilvl": "cilvl",
    "c lvl": "clvl",
    "c mod 1": "cmod1",
    "c mod 1 chance": "cm1chanc",
    "c mod 1 max": "cmod1max",
    "c mod 1 min": "cmod1min",
    "c mod 1 param": "cm1param",
    "c mod 2": "cmod2",
    "c mod 2 chance": "cm2chanc",
    "c mod 2 max": "cmod2max",
    "c mod 2 min": "cmod2min",
    "c mod 2 param": "cm2param",
    "c mod 3": "cmod3",
    "c mod 3 chance": "cm3chanc",
    "c mod 3 max": "cmod3max",
    "c mod 3 min": "cmod3min",
    "c mod 3 param": "cm3param",
    "c mod 4": "cmod4",
    "c mod 4 chance": "cm4chanc",
    "c mod 4 max": "cmod4max",
    "c mod 4 min": "cmod4min",
    "c mod 4 param": "cm4param",
    "c mod 5": "cmod5",
    "c mod 5 chance": "cm5chanc",
    "c mod 5 max": "cmod5max",
    "c mod 5 min": "cmod5min",
    "c mod 5 param": "cm5param",
    "c plvl": "cplvl",
    "cHitPar1": "cHitPar1",
    "cHitPar2": "cHitPar2",
    "cHitPar3": "cHitPar3",
    "calc1": "calc1",
    "calc2": "calc2",
    "calc3": "calc3",
    "calc4": "calc4",
    "calc5": "calc5",
    "calc6": "calc6",
    "camt1": "camt1",
    "camt2": "camt2",
    "camt3": "camt3",
    "camt4": "camt4",
    "canNotUseTwoHandedItems": "cNUTHIte",
    "canstack": "cansta",
    "carry1": "carry1",
    "castoverlay": "castov",
    "champion": "Champ",
    "chance1": "chance1",
    "chance1 (H)": "chance1H",
    "chance1 (N)": "chance1N",
    "chance2": "chance2",
    "chance2 (H)": "chance2H",
    "chance2 (N)": "chance2N",
    "chance3": "chance3",
    "chance3 (H)": "chance3H",
    "chance3 (N)": "chance3N",
    "chance4": "chance4",
    "chance4 (H)": "chance4H",
    "chance4 (N)": "chance4N",
    "chance5": "chance5",
    "chance5 (H)": "chance5H",
    "chance5 (N)": "chance5N",
    "chance6": "chance6",
    "chance6 (H)": "chance6H",
    "chance6 (N)": "chance6N",
    "charclass": "charcl",
    "chrtransform": "chrtra",
    "class": "class",
    "classlevelrangeend": "classl",
    "classlevelrangestart": "classl",
    "classlevelreq": "classl",
    "classspecific": "classs",
    "cltactivefunc": "cltact",
    "cltcalc1": "cltcal1",
    "cltcalc2": "cltcal2",
    "cltcalc3": "cltcal3",
    "cltdofunc": "cltdof",
    "cltevent": "clteve",
    "clteventfunc": "clteve",
    "cltmissile": "cltmis",
    "cltmissilea": "cltmis",
    "cltmissileb": "cltmis",
    "cltmissilec": "cltmis",
    "cltmissiled": "cltmis",
    "cltoverlaya": "cltove",
    "cltoverlayb": "cltove",
    "cltprgfunc1": "cltprg1",
    "cltprgfunc2": "cltprg2",
    "cltprgfunc3": "cltprg3",
    "cltstfunc": "cltstf",
    "cltstopfunc": "cltsto",
    "cmon1": "cmon1",
    "cmon2": "cmon2",
    "cmon3": "cmon3",
    "cmon4": "cmon4",
    "code": "code",
    "coldeffect": "coldef",
    "coldeffect(H)": "coldefH",
    "coldeffect(N)": "coldefN",
    "colorpri": "colorp",
    "colorshift": "colors",
    "commonactcof": "common",
    "compactsave": "compac",
    "complete": "comple",
    "component": "Comp",
    "compositeDeath": "cDeath",
    "constants": "consta",
    "corpseSel": "cSel",
    "cost": "cost",
    "cost add": "costadd",
    "cost mult": "costmult",
    "cpct1": "cpct1",
    "cpct2": "cpct2",
    "cpct3": "cpct3",
    "cpct4": "cpct4",
    "cpick": "cpick",
    "cpick (H)": "cpickH",
    "cpick (N)": "cpickN",
    "critter": "critte",
    "cstate1": "cstate1",
    "cstate2": "cstate2",
    "cube modifier type": "cMtype",
    "curable": "curabl",
    "curse": "curse",
    "dA1": "dA1",
    "dA2": "dA2",
    "dBL": "dBL",
    "dDD": "dDD",
    "dDT": "dDT",
    "dGH": "dGH",
    "dKB": "dKB",
    "dNU": "dNU",
    "dParam1": "dParam1",
    "dParam2": "dParam2",
    "dRN": "dRN",
    "dS1": "dS1",
    "dS2": "dS2",
    "dS3": "dS3",
    "dS4": "dS4",
    "dSC": "dSC",
    "dSQ": "dSQ",
    "dWL": "dWL",
    "damagerelated": "damage",
    "damblue": "damblu",
    "damred": "damred",
    "ddam calc1": "dcalc1",
    "ddam calc2": "dcalc2",
    "deadCol": "deadCol",
    "deathDmg": "deathDmg",
    "decquant": "decqua",
    "defaultItemCodeCol1": "dICCol1",
    "defaultItemCodeCol2": "dICCol2",
    "defaultItemCodeCol3": "dICCol3",
    "defaultItemCodeCol4": "dICCol4",
    "defaultItemTypeCol1": "dITCol1",
    "defaultItemTypeCol2": "dITCol2",
    "defaultItemTypeCol3": "dITCol3",
    "defaultItemTypeCol4": "dITCol4",
    "demon": "demon",
    "descatt": "descat",
    "desccalca1": "descca1",
    "desccalca2": "descca2",
    "desccalca3": "descca3",
    "desccalca4": "descca4",
    "desccalca5": "descca5",
    "desccalca6": "descca6",
    "desccalcb1": "descca1",
    "desccalcb2": "descca2",
    "desccalcb3": "descca3",
    "desccalcb4": "descca4",
    "desccalcb5": "descca5",
    "desccalcb6": "descca6",
    "descdam": "descda",
    "descfunc": "descfu",
    "descline1": "descli1",
    "descline2": "descli2",
    "descline3": "descli3",
    "descline4": "descli4",
    "descline5": "descli5",
    "descline6": "descli6",
    "descmissile1": "descmi1",
    "descmissile2": "descmi2",
    "descmissile3": "descmi3",
    "descpriority": "descpr",
    "description": "Desc",
    "descstr2": "descst2",
    "descstrneg": "descst",
    "descstrpos": "descst",
    "desctexta1": "descte1",
    "desctexta2": "descte2",
    "desctexta3": "descte3",
    "desctexta4": "descte4",
    "desctexta5": "descte5",
    "desctexta6": "descte6",
    "desctextb1": "descte1",
    "desctextb2": "descte2",
    "desctextb3": "descte3",
    "desctextb4": "descte4",
    "desctextb5": "descte5",
    "desctextb6": "descte6",
    "descval": "descva",
    "dex": "dex",
    "dgrp": "dgrp",
    "dgrpfunc": "dgrpfu",
    "dgrpstr2": "dgrpst2",
    "dgrpstrneg": "dgrpst",
    "dgrpstrpos": "dgrpst",
    "dgrpval": "dgrpva",
    "diablocloneweight": "diablo",
    "dir": "dir",
    "direct": "direct",
    "disguise": "disgui",
    "dosound": "dosoun",
    "dosound a": "dosouna",
    "dosound b": "dosounb",
    "drawhp": "drawhp",
    "dropsfxframe": "dropsf",
    "dropsound": "drpsnd",
    "dsc2calca1": "dsc2ca1",
    "dsc2calca2": "dsc2ca2",
    "dsc2calca3": "dsc2ca3",
    "dsc2calca4": "dsc2ca4",
    "dsc2calca5": "dsc2ca5",
    "dsc2calcb1": "dsc2ca1",
    "dsc2calcb2": "dsc2ca2",
    "dsc2calcb3": "dsc2ca3",
    "dsc2calcb4": "dsc2ca4",
    "dsc2calcb5": "dsc2ca5",
    "dsc2line1": "dsc2li1",
    "dsc2line2": "dsc2li2",
    "dsc2line3": "dsc2li3",
    "dsc2line4": "dsc2li4",
    "dsc2line5": "dsc2li5",
    "dsc2texta1": "dsc2te1",
    "dsc2texta2": "dsc2te2",
    "dsc2texta3": "dsc2te3",
    "dsc2texta4": "dsc2te4",
    "dsc2texta5": "dsc2te5",
    "dsc2textb1": "dsc2te1",
    "dsc2textb2": "dsc2te2",
    "dsc2textb3": "dsc2te3",
    "dsc2textb4": "dsc2te4",
    "dsc2textb5": "dsc2te5",
    "dsc3calca1": "dsc3ca1",
    "dsc3calca2": "dsc3ca2",
    "dsc3calca3": "dsc3ca3",
    "dsc3calca4": "dsc3ca4",
    "dsc3calca5": "dsc3ca5",
    "dsc3calca6": "dsc3ca6",
    "dsc3calca7": "dsc3ca7",
    "dsc3calcb1": "dsc3ca1",
    "dsc3calcb2": "dsc3ca2",
    "dsc3calcb3": "dsc3ca3",
    "dsc3calcb4": "dsc3ca4",
    "dsc3calcb5": "dsc3ca5",
    "dsc3calcb6": "dsc3ca6",
    "dsc3calcb7": "dsc3ca7",
    "dsc3line1": "dsc3li1",
    "dsc3line2": "dsc3li2",
    "dsc3line3": "dsc3li3",
    "dsc3line4": "dsc3li4",
    "dsc3line5": "dsc3li5",
    "dsc3line6": "dsc3li6",
    "dsc3line7": "dsc3li7",
    "dsc3texta1": "dsc3te1",
    "dsc3texta2": "dsc3te2",
    "dsc3texta3": "dsc3te3",
    "dsc3texta4": "dsc3te4",
    "dsc3texta5": "dsc3te5",
    "dsc3texta6": "dsc3te6",
    "dsc3texta7": "dsc3te7",
    "dsc3textb1": "dsc3te1",
    "dsc3textb2": "dsc3te2",
    "dsc3textb3": "dsc3te3",
    "dsc3textb4": "dsc3te4",
    "dsc3textb5": "dsc3te5",
    "dsc3textb6": "dsc3te6",
    "dsc3textb7": "dsc3te7",
    "durability": "Dur",
    "durwarning": "durwar",
    "effectclass": "effect",
    "element": "elemen",
    "enabled": "enable",
    "enhanceable": "enhanc",
    "equiv1": "equiv1",
    "equiv2": "equiv2",
    "equiv3": "equiv3",
    "equivalentcharclass": "equiva",
    "etype1": "etype1",
    "etype2": "etype2",
    "etype3": "etype3",
    "etype4": "etype4",
    "etype5": "etype5",
    "etypea1": "etypea1",
    "etypea2": "etypea2",
    "etypeb1": "etypeb1",
    "etypeb2": "etypeb2",
    "event": "event",
    "exclude1": "exclud1",
    "exclude2": "exclud2",
    "exp": "exp",
    "fCallback": "fCallba",
    "fMin": "fMin",
    "fPick": "fPick",
    "feetBottom": "fBottom",
    "feetHeight": "fHeight",
    "feetLeft": "feetLeft",
    "feetRight": "fRight",
    "feetTop": "feetTop",
    "feetWidth": "fWidth",
    "finishing": "fnshng",
    "firstLadderSeason": "fLSeason",
    "flippyfile": "flippy",
    "flying": "flying",
    "frame": "frame",
    "frequency": "Freq",
    "func1": "func1",
    "func2": "func2",
    "func3": "func3",
    "func4": "func4",
    "func5": "func5",
    "func6": "func6",
    "func7": "func7",
    "gamble cost": "gcost",
    "gemapplytype": "gemapp",
    "gemoffset": "gmffst",
    "gemsockets": "gemsoc",
    "genericSpawn": "gSpawn",
    "gfxclass": "gfxcla",
    "gfxtype": "gfxtyp",
    "globaldelay": "global",
    "gloves": "gloves",
    "glovesBottom": "gBottom",
    "glovesHeight": "gHeight",
    "glovesLeft": "gLeft",
    "glovesRight": "gRight",
    "glovesTop": "gTop",
    "glovesWidth": "gWidth",
    "green": "green",
    "gridBottom": "gBottom",
    "gridBoxHeight": "gBHeight",
    "gridBoxWidth": "gBWidth",
    "gridLeft": "gridLeft",
    "gridRight": "gRight",
    "gridTop": "gridTop",
    "gridX": "gridX",
    "gridY": "gridY",
    "group": "group",
    "hUndead": "hUndead",
    "hasinv": "hasinv",
    "hcIdx": "hcIdx",
    "headBottom": "hBottom",
    "headHeight": "hHeight",
    "headLeft": "headLeft",
    "headRight": "hRight",
    "headTop": "headTop",
    "headWidth": "hWidth",
    "helmMod1Code": "hMod1Co",
    "helmMod1Max": "hMod1Ma",
    "helmMod1Min": "hMod1Mi",
    "helmMod1Param": "hMd1Prm",
    "helmMod2Code": "hMod2Co",
    "helmMod2Max": "hMod2Ma",
    "helmMod2Min": "hMod2Mi",
    "helmMod2Param": "hMd2Prm",
    "helmMod3Code": "hMod3Co",
    "helmMod3Max": "hMod3Ma",
    "helmMod3Min": "hMod3Mi",
    "helmMod3Param": "hMd3Prm",
    "hide": "hide",
    "hidedead": "hidede",
    "hit class": "hitclass",
    "hpadd": "hpadd",
    "htHeight": "htHeight",
    "htLeft": "htLeft",
    "htTop": "htTop",
    "htWidth": "htWidth",
    "icontype": "iconty",
    "id": "id",
    "ilvl": "ilvl",
    "immediate": "immdte",
    "inTown": "inTown",
    "index": "index",
    "inert": "inert",
    "input 1": "input1",
    "input 2": "input2",
    "input 3": "input3",
    "input 4": "input4",
    "input 5": "input5",
    "input 6": "input6",
    "input 7": "input7",
    "int": "int",
    "interact": "intera",
    "interrupt": "interr",
    "invBottom": "iBottom",
    "invLeft": "invLeft",
    "invRight": "invRight",
    "invTop": "invTop",
    "inventory": "Inv",
    "invfile": "invfil",
    "invheight": "invhei",
    "invtransform": "invtra",
    "invwidth": "invwid",
    "isAtt": "isAtt",
    "isMelee": "isMelee",
    "isSel": "isSel",
    "isSpawn": "isSpawn",
    "item": "item",
    "item proc descline count": "ipdcount",
    "item proc text": "iptext",
    "item1": "item1",
    "item10": "item10",
    "item10count": "item10",
    "item10loc": "item10",
    "item10quality": "item10",
    "item1count": "item1c",
    "item1loc": "item1l",
    "item1quality": "item1q",
    "item2": "item2",
    "item2count": "item2c",
    "item2loc": "item2l",
    "item2quality": "item2q",
    "item3": "item3",
    "item3count": "item3c",
    "item3loc": "item3l",
    "item3quality": "item3q",
    "item4": "item4",
    "item4count": "item4c",
    "item4loc": "item4l",
    "item4quality": "item4q",
    "item5": "item5",
    "item5count": "item5c",
    "item5loc": "item5l",
    "item5quality": "item5q",
    "item6": "item6",
    "item6count": "item6c",
    "item6loc": "item6l",
    "item6quality": "item6q",
    "item7": "item7",
    "item7count": "item7c",
    "item7loc": "item7l",
    "item7quality": "item7q",
    "item8": "item8",
    "item8count": "item8c",
    "item8loc": "item8l",
    "item8quality": "item8q",
    "item9": "item9",
    "item9count": "item9c",
    "item9loc": "item9l",
    "item9quality": "item9q",
    "itemevent1": "itmvnt1",
    "itemevent2": "itmvnt2",
    "itemeventfunc1": "itemev1",
    "itemeventfunc2": "itemev2",
    "itemtrans": "itemtr",
    "itemtype": "itemty",
    "itype1": "itype1",
    "itype2": "itype2",
    "itype3": "itype3",
    "itype4": "itype4",
    "itype5": "itype5",
    "itype6": "itype6",
    "itype7": "itype7",
    "itypea1": "itypea1",
    "itypea2": "itypea2",
    "itypea3": "itypea3",
    "itypeb1": "itypeb1",
    "itypeb2": "itypeb2",
    "itypeb3": "itypeb3",
    "keepzero": "keepze",
    "killable": "killab",
    "lArm": "lArm",
    "lArmBottom": "lABottom",
    "lArmHeight": "lAHeight",
    "lArmLeft": "lArmLeft",
    "lArmRight": "lARight",
    "lArmTop": "lArmTop",
    "lArmWidth": "lAWidth",
    "lHandBottom": "lHBottom",
    "lHandHeight": "lHHeight",
    "lHandLeft": "lHLeft",
    "lHandRight": "lHRight",
    "lHandTop": "lHandTop",
    "lHandWidth": "lHWidth",
    "lSPad": "lSPad",
    "lUndead": "lUndead",
    "large": "large",
    "lastLadderSeason": "lLSeason",
    "leftArmItemType": "lAIType",
    "leftskill": "leftsk",
    "len": "len",
    "letter": "letter",
    "level": "level",
    "levelreq": "levelr",
    "life": "life",
    "light-b": "lightb",
    "light-g": "lightg",
    "light-r": "lightr",
    "lightradius": "lightr",
    "limitCorpses": "lCorpse",
    "lob": "lob",
    "loc1": "loc1",
    "loc2": "loc2",
    "loc3": "loc3",
    "localBlood": "lBlood",
    "localdelay": "lcldly",
    "lvl": "lvl",
    "lvl req": "lvlreq",
    "lvlmana": "lvlman",
    "mA1": "mA1",
    "mA2": "mA2",
    "mBL": "mBL",
    "mDD": "mDD",
    "mDT": "mDT",
    "mGH": "mGH",
    "mKB": "mKB",
    "mNU": "mNU",
    "mRN": "mRN",
    "mS1": "mS1",
    "mS2": "mS2",
    "mS3": "mS3",
    "mS4": "mS4",
    "mSC": "mSC",
    "mSQ": "mSQ",
    "mWL": "mWL",
    "magic lvl": "magiclvl",
    "mana": "mana",
    "manashift": "mnshft",
    "max buy": "maxbuy",
    "max buy (H)": "maxbuyH",
    "max buy (N)": "maxbuyN",
    "max1": "max1",
    "max1 (H)": "max1H",
    "max1 (N)": "max1N",
    "max10": "max10",
    "max11": "max11",
    "max12": "max12",
    "max2": "max2",
    "max2 (H)": "max2H",
    "max2 (N)": "max2N",
    "max3": "max3",
    "max3 (H)": "max3H",
    "max3 (N)": "max3N",
    "max4": "max4",
    "max4 (H)": "max4H",
    "max4 (N)": "max4N",
    "max5": "max5",
    "max5 (H)": "max5H",
    "max5 (N)": "max5N",
    "max6": "max6",
    "max6 (H)": "max6H",
    "max6 (N)": "max6N",
    "max7": "max7",
    "max8": "max8",
    "max9": "max9",
    "maxHP": "maxHP",
    "maxac": "maxac",
    "maxdam": "maxdam",
    "maxlevel": "maxlev",
    "maxlvl": "maxlvl",
    "maxmisdam": "mxmsdm",
    "maxnpcitemlevel": "maxnpc",
    "maxstack": "maxsta",
    "maxstat": "maxsta",
    "mclass1": "mclass1",
    "mclass2": "mclass2",
    "mclass3": "mclass3",
    "mclass4": "mclass4",
    "meleeonly": "mlnly",
    "micon1": "micon1",
    "micon2": "micon2",
    "micon3": "micon3",
    "micon4": "micon4",
    "min diff": "mindiff",
    "min1": "min1",
    "min1 (H)": "min1H",
    "min1 (N)": "min1N",
    "min10": "min10",
    "min11": "min11",
    "min12": "min12",
    "min2": "min2",
    "min2 (H)": "min2H",
    "min2 (N)": "min2N",
    "min3": "min3",
    "min3 (H)": "min3H",
    "min3 (N)": "min3N",
    "min4": "min4",
    "min4 (H)": "min4H",
    "min4 (N)": "min4N",
    "min5": "min5",
    "min5 (H)": "min5H",
    "min5 (N)": "min5N",
    "min6": "min6",
    "min6 (H)": "min6H",
    "min6 (N)": "min6N",
    "min7": "min7",
    "min8": "min8",
    "min9": "min9",
    "minHP": "minHP",
    "minac": "minac",
    "mindam": "mindam",
    "minion1": "minion1",
    "minion2": "minion2",
    "minmana": "minman",
    "minmisdam": "mnmsdm",
    "minstack": "minsta",
    "missile": "Mis",
    "missiletype": "missil",
    "mod 1": "mod1",
    "mod 1 chance": "m1chance",
    "mod 1 max": "mod1max",
    "mod 1 min": "mod1min",
    "mod 1 param": "m1param",
    "mod 2": "mod2",
    "mod 2 chance": "m2chance",
    "mod 2 max": "mod2max",
    "mod 2 min": "mod2min",
    "mod 2 param": "m2param",
    "mod 3": "mod3",
    "mod 3 chance": "m3chance",
    "mod 3 max": "mod3max",
    "mod 3 min": "mod3min",
    "mod 3 param": "m3param",
    "mod 4": "mod4",
    "mod 4 chance": "m4chance",
    "mod 4 max": "mod4max",
    "mod 4 min": "mod4min",
    "mod 4 param": "m4param",
    "mod 5": "mod5",
    "mod 5 chance": "m5chance",
    "mod 5 max": "mod5max",
    "mod 5 min": "mod5min",
    "mod 5 param": "m5param",
    "mod1": "mod1",
    "mod1code": "mod1co",
    "mod1max": "mod1ma",
    "mod1min": "mod1mi",
    "mod1param": "md1prm",
    "mod2": "mod2",
    "mod2code": "mod2co",
    "mod2max": "mod2ma",
    "mod2min": "mod2mi",
    "mod2param": "md2prm",
    "mod3": "mod3",
    "mod3code": "mod3co",
    "mod3max": "mod3ma",
    "mod3min": "mod3mi",
    "mod3param": "md3prm",
    "mode": "mode",
    "mon1": "mon1",
    "mon10": "mon10",
    "mon11": "mon11",
    "mon12": "mon12",
    "mon13": "mon13",
    "mon14": "mon14",
    "mon15": "mon15",
    "mon16": "mon16",
    "mon17": "mon17",
    "mon18": "mon18",
    "mon19": "mon19",
    "mon2": "mon2",
    "mon20": "mon20",
    "mon21": "mon21",
    "mon22": "mon22",
    "mon23": "mon23",
    "mon24": "mon24",
    "mon25": "mon25",
    "mon3": "mon3",
    "mon4": "mon4",
    "mon5": "mon5",
    "mon6": "mon6",
    "mon7": "mon7",
    "mon8": "mon8",
    "mon9": "mon9",
    "monanim": "monani",
    "monstaydeath": "monsta",
    "monster": "Mon",
    "multibuy": "multib",
    "multiply": "multip",
    "name": "name",
    "namestr": "namest",
    "neckBottom": "nBottom",
    "neckHeight": "nHeight",
    "neckLeft": "neckLeft",
    "neckRight": "nRight",
    "neckTop": "neckTop",
    "neckWidth": "nWidth",
    "neverCount": "nCount",
    "nmon1": "nmon1",
    "nmon10": "nmon10",
    "nmon11": "nmon11",
    "nmon12": "nmon12",
    "nmon13": "nmon13",
    "nmon14": "nmon14",
    "nmon15": "nmon15",
    "nmon16": "nmon16",
    "nmon17": "nmon17",
    "nmon18": "nmon18",
    "nmon19": "nmon19",
    "nmon2": "nmon2",
    "nmon20": "nmon20",
    "nmon21": "nmon21",
    "nmon22": "nmon22",
    "nmon23": "nmon23",
    "nmon24": "nmon24",
    "nmon25": "nmon25",
    "nmon3": "nmon3",
    "nmon4": "nmon4",
    "nmon5": "nmon5",
    "nmon6": "nmon6",
    "nmon7": "nmon7",
    "nmon8": "nmon8",
    "nmon9": "nmon9",
    "noAlwaysSpawn": "nASpawn",
    "noAura": "noAura",
    "noGfxHitTest": "nGHTest",
    "noMap": "noMap",
    "noOvly": "noOvly",
    "noRatio": "noRatio",
    "noSel": "noSel",
    "noUniqueShift": "nUShift",
    "noammo": "noammo",
    "noclear": "noclea",
    "nodurability": "nodura",
    "nolimit": "nolimi",
    "nomultishot": "nomult",
    "nooverlays": "nvrlys",
    "normcode": "normco",
    "nosend": "nosend",
    "notondead": "ntndd",
    "npc": "npc",
    "numboxes": "numbox",
    "numinputs": "nmnpts",
    "objCol": "objCol",
    "offsound": "offsou",
    "oninit": "oninit",
    "onsound": "onsoun",
    "op": "op",
    "op base": "opbase",
    "op param": "opparam",
    "op stat1": "opstat1",
    "op stat2": "opstat2",
    "op stat3": "opstat3",
    "opendoors": "opndrs",
    "output": "output",
    "output b": "outputb",
    "output c": "outputc",
    "overlay": "Ovl",
    "overlay1": "Ovl1",
    "overlay2": "Ovl2",
    "overlay3": "Ovl3",
    "overlay4": "Ovl4",
    "p1dmelem": "p1dmel",
    "p1dmmax": "p1dmma",
    "p1dmmin": "p1dmmi",
    "p2dmelem": "p2dmel",
    "p2dmmax": "p2dmma",
    "p2dmmin": "p2dmmi",
    "p3dmelem": "p3dmel",
    "p3dmmax": "p3dmma",
    "p3dmmin": "p3dmmi",
    "pCltDoFunc": "pCDFunc",
    "pCltHitFunc": "pCHFunc",
    "pSpell": "pSpell",
    "pSrvDmgFunc": "pSDFunc",
    "pSrvDoFunc": "pSDFunc",
    "pSrvHitFunc": "pSHFunc",
    "par1": "par1",
    "par1 (H)": "par1H",
    "par1 (N)": "par1N",
    "par10": "par10",
    "par11": "par11",
    "par12": "par12",
    "par2": "par2",
    "par2 (H)": "par2H",
    "par2 (N)": "par2N",
    "par3": "par3",
    "par3 (H)": "par3H",
    "par3 (N)": "par3N",
    "par4": "par4",
    "par4 (H)": "par4H",
    "par4 (N)": "par4N",
    "par5": "par5",
    "par5 (H)": "par5H",
    "par5 (N)": "par5N",
    "par6": "par6",
    "par6 (H)": "par6H",
    "par6 (N)": "par6N",
    "par7": "par7",
    "par8": "par8",
    "par9": "par9",
    "param": "param",
    "partysend": "partys",
    "passive": "Pass",
    "passivecalc1": "passiv1",
    "passivecalc10": "passiv10",
    "passivecalc11": "passiv11",
    "passivecalc12": "passiv12",
    "passivecalc13": "passiv13",
    "passivecalc14": "passiv14",
    "passivecalc2": "passiv2",
    "passivecalc3": "passiv3",
    "passivecalc4": "passiv4",
    "passivecalc5": "passiv5",
    "passivecalc6": "passiv6",
    "passivecalc7": "passiv7",
    "passivecalc8": "passiv8",
    "passivecalc9": "passiv9",
    "passiveitype": "passiv",
    "passivereqweaponcount": "passiv",
    "passivestat1": "passiv1",
    "passivestat10": "passiv10",
    "passivestat11": "passiv11",
    "passivestat12": "passiv12",
    "passivestat13": "passiv13",
    "passivestat14": "passiv14",
    "passivestat2": "passiv2",
    "passivestat3": "passiv3",
    "passivestat4": "passiv4",
    "passivestat5": "passiv5",
    "passivestat6": "passiv6",
    "passivestat7": "passiv7",
    "passivestat8": "passiv8",
    "passivestat9": "passiv9",
    "passivestate": "passiv",
    "perdelay": "perdel",
    "periodic": "period",
    "pet type": "pettype",
    "petIgnore": "pIgnore",
    "petmax": "petmax",
    "pettype": "pettyp",
    "pgsv": "pgsv",
    "pgsvoverlay": "pgsvov",
    "pixHeight": "pHeight",
    "placespawn": "places",
    "plrstaydeath": "plrsta",
    "plvl": "plvl",
    "prgcalc1": "prgcal1",
    "prgcalc2": "prgcal2",
    "prgcalc3": "prgcal3",
    "prgchargesconsumed": "prgcha",
    "prgchargestocast": "prgcha",
    "prgdam": "prgdam",
    "prgoverlay": "prgove",
    "prgsound": "prgsou",
    "prgstack": "prgsta",
    "primeevil": "prmvl",
    "progressive": "progre",
    "prop1": "prop1",
    "prop1 (H)": "prop1H",
    "prop1 (N)": "prop1N",
    "prop10": "prop10",
    "prop11": "prop11",
    "prop12": "prop12",
    "prop2": "prop2",
    "prop2 (H)": "prop2H",
    "prop2 (N)": "prop2N",
    "prop3": "prop3",
    "prop3 (H)": "prop3H",
    "prop3 (N)": "prop3N",
    "prop4": "prop4",
    "prop4 (H)": "prop4H",
    "prop4 (N)": "prop4N",
    "prop5": "prop5",
    "prop5 (H)": "prop5H",
    "prop5 (N)": "prop5N",
    "prop6": "prop6",
    "prop6 (H)": "prop6H",
    "prop6 (N)": "prop6N",
    "prop7": "prop7",
    "prop8": "prop8",
    "prop9": "prop9",
    "qntwarning": "qntwar",
    "quest": "quest",
    "questbuymult A": "questbA",
    "questbuymult B": "questbB",
    "questbuymult C": "questbC",
    "questdiffcheck": "questd",
    "questflag A": "qstflgA",
    "questflag B": "qstflgB",
    "questflag C": "qstflgC",
    "questrepmult A": "questrA",
    "questrepmult B": "questrB",
    "questrepmult C": "questrC",
    "questsellmult A": "questsA",
    "questsellmult B": "questsB",
    "questsellmult C": "questsC",
    "rArm": "rArm",
    "rArmBottom": "rABottom",
    "rArmHeight": "rAHeight",
    "rArmLeft": "rArmLeft",
    "rArmRight": "rARight",
    "rArmTop": "rArmTop",
    "rArmWidth": "rAWidth",
    "rHandBottom": "rHBottom",
    "rHandHeight": "rHHeight",
    "rHandLeft": "rHLeft",
    "rHandRight": "rHRight",
    "rHandTop": "rHandTop",
    "rHandWidth": "rHWidth",
    "rSPad": "rSPad",
    "range": "range",
    "rangeadder": "rngddr",
    "rangedspawn": "ranged",
    "rangedtype": "ranged",
    "rare": "rare",
    "rarity": "rarity",
    "rcblue": "rcblue",
    "rcred": "rcred",
    "remfunc": "remfun",
    "remhit": "remhit",
    "removerlay": "rmvrly",
    "rep mult": "repmult",
    "repeat": "repeat",
    "reqdex": "reqdex",
    "reqint": "reqint",
    "reqlevel": "reqlev",
    "reqskill1": "reqski1",
    "reqskill2": "reqski2",
    "reqskill3": "reqski3",
    "reqstr": "reqstr",
    "reqvit": "reqvit",
    "reset time in minutes": "rtiminut",
    "restore": "Rest",
    "restrict": "restri",
    "resurrectcostdivisor": "resurr",
    "resurrectcostmax": "resurr",
    "resurrectcostmultiplier": "resurr",
    "revive": "revive",
    "rfblue": "rfblue",
    "rfred": "rfred",
    "rightArmItemType": "rAIType",
    "rightskill": "rights",
    "rlblue": "rlblue",
    "rlred": "rlred",
    "rpblue": "rpblue",
    "rpred": "rpred",
    "sHitPar1": "sHitPar1",
    "sHitPar2": "sHitPar2",
    "sHitPar3": "sHitPar3",
    "scepter": "scepte",
    "scroll": "scroll",
    "sell mult": "sellmult",
    "seqinput": "seqinp",
    "seqnum": "seqnum",
    "seqtrans": "seqtra",
    "sequence": "sequen",
    "set": "set",
    "set1": "set1",
    "set2": "set2",
    "set3": "set3",
    "set4": "set4",
    "set5": "set5",
    "set6": "set6",
    "set7": "set7",
    "setfunc": "setfun",
    "setinvfile": "setinv",
    "shatter": "shatte",
    "shield": "shield",
    "shieldMod1Code": "sMod1Co",
    "shieldMod1Max": "sMod1Ma",
    "shieldMod1Min": "sMod1Mi",
    "shieldMod1Param": "sMd1Prm",
    "shieldMod2Code": "sMod2Co",
    "shieldMod2Max": "sMod2Ma",
    "shieldMod2Min": "sMod2Mi",
    "shieldMod2Param": "sMd2Prm",
    "shieldMod3Code": "sMod3Co",
    "shieldMod3Max": "sMod3Ma",
    "shieldMod3Min": "sMod3Mi",
    "shieldMod3Param": "sMd3Prm",
    "shiftSel": "shiftSel",
    "skill": "skill",
    "skilldesc": "skilld",
    "skpoints": "skpoin",
    "small": "small",
    "soft": "soft",
    "sparsePopulate": "sPop",
    "spawn": "spawn",
    "spawnCol": "spawnCol",
    "spawnable": "Spawn",
    "spawnmode": "spawnm",
    "spawnstack": "spawns",
    "spawnx": "spawnx",
    "spawny": "spawny",
    "speed": "speed",
    "spelldesc": "spelld",
    "spelldesccalc": "spelld",
    "spelldesccolor": "spelld",
    "spelldescstr": "spelld",
    "spelldescstr2": "spelld2",
    "spellicon": "spllcn",
    "srvactivefunc": "srvact",
    "srvdofunc": "srvdof",
    "srvmissile": "srvmis",
    "srvmissilea": "srvmis",
    "srvmissileb": "srvmis",
    "srvmissilec": "srvmis",
    "srvoverlay": "srvove",
    "srvprgfunc1": "srvprg1",
    "srvprgfunc2": "srvprg2",
    "srvprgfunc3": "srvprg3",
    "srvstfunc": "srvstf",
    "srvstopfunc": "srvsto",
    "stackable": "Stack",
    "staff": "staff",
    "stambarblue": "stamba",
    "stamina": "stamin",
    "start": "start",
    "startmana": "startm",
    "stat": "stat",
    "stat1": "stat1",
    "stat2": "stat2",
    "stat3": "stat3",
    "stat4": "stat4",
    "stat5": "stat5",
    "stat6": "stat6",
    "stat7": "stat7",
    "state": "state",
    "str": "str",
    "str alt": "stralt",
    "str long": "strlong",
    "str name": "strname",
    "str short": "strshort",
    "strplur": "strplu",
    "stsound": "stsoun",
    "stsoundclass": "stsoun",
    "stsounddelay": "stsoun",
    "stsuccessonly": "stsucc",
    "stuff": "stuff",
    "summode": "summod",
    "summon": "summon",
    "sumoverlay": "smvrly",
    "sumsk1calc": "sumsk1",
    "sumsk2calc": "sumsk2",
    "sumsk3calc": "sumsk3",
    "sumsk4calc": "sumsk4",
    "sumsk5calc": "sumsk5",
    "sumskill1": "sumski1",
    "sumskill2": "sumski2",
    "sumskill3": "sumski3",
    "sumskill4": "sumski4",
    "sumskill5": "sumski5",
    "sumumod": "sumumo",
    "sunder-res-reduce": "srreduce",
    "sunderfull": "sunder",
    "switchai": "switch",
    "tgtoverlay": "tgtove",
    "tgtsound": "tgtsou",
    "threat": "threat",
    "token": "token",
    "torsoBottom": "tBottom",
    "torsoHeight": "tHeight",
    "torsoLeft": "tLeft",
    "torsoRight": "tRight",
    "torsoTop": "torsoTop",
    "torsoWidth": "tWidth",
    "town": "town",
    "transform": "Trans",
    "transformcolor": "transf",
    "transparent": "transp",
    "transtbl": "transt",
    "type": "type",
    "type2": "type2",
    "ubercode": "uberco",
    "udead": "udead",
    "ultracode": "ultrac",
    "umon1": "umon1",
    "umon10": "umon10",
    "umon11": "umon11",
    "umon12": "umon12",
    "umon13": "umon13",
    "umon14": "umon14",
    "umon15": "umon15",
    "umon16": "umon16",
    "umon17": "umon17",
    "umon18": "umon18",
    "umon19": "umon19",
    "umon2": "umon2",
    "umon20": "umon20",
    "umon21": "umon21",
    "umon22": "umon22",
    "umon23": "umon23",
    "umon24": "umon24",
    "umon25": "umon25",
    "umon3": "umon3",
    "umon4": "umon4",
    "umon5": "umon5",
    "umon6": "umon6",
    "umon7": "umon7",
    "umon8": "umon8",
    "umon9": "umon9",
    "unflatDead": "uDead",
    "unique": "unique",
    "uniqueinvfile": "unique",
    "uniquemod": "unqmd",
    "unsummon": "unsumm",
    "upick": "upick",
    "upick (H)": "upickH",
    "upick (N)": "upickN",
    "useServerMissilesOnRemoteClients": "uSMORCli",
    "useable": "useabl",
    "usemanaondo": "useman",
    "usesound": "usesou",
    "val1": "val1",
    "val2": "val2",
    "val3": "val3",
    "val4": "val4",
    "val5": "val5",
    "val6": "val6",
    "val7": "val7",
    "value": "value",
    "version": "versio",
    "vit": "vit",
    "wand": "wand",
    "wanderingMonsterPopulateChance": "wMPChanc",
    "wanderingMonsterRegionTotal": "wMRTotal",
    "wanderingPopulateRandomChance": "wPRChanc",
    "wanderingnpcrange": "wander",
    "wanderingnpcstart": "wander",
    "warp": "warp",
    "waypoint1": "waypoi1",
    "waypoint2": "waypoi2",
    "waypoint3": "waypoi3",
    "waypoint4": "waypoi4",
    "waypoint5": "waypoi5",
    "waypoint6": "waypoi6",
    "waypoint7": "waypoi7",
    "waypoint8": "waypoi8",
    "waypoint9": "waypoi9",
    "wclass": "wclass",
    "weapon": "weapon",
    "weaponMod1Code": "wMod1Co",
    "weaponMod1Max": "wMod1Ma",
    "weaponMod1Min": "wMod1Mi",
    "weaponMod1Param": "wMd1Prm",
    "weaponMod2Code": "wMod2Co",
    "weaponMod2Max": "wMod2Ma",
    "weaponMod2Min": "wMod2Mi",
    "weaponMod2Param": "wMd2Prm",
    "weaponMod3Code": "wMod3Co",
    "weaponMod3Max": "wMod3Ma",
    "weaponMod3Min": "wMod3Mi",
    "weaponMod3Param": "wMd3Prm",
    "weaponsnd": "wpnsnd",
    "weapsel": "weapse",
    "xfer": "xfer",
    "xoffset": "xoffse",
    "yoffset": "yoffse",
    "zoffset": "zoffse",
    "zoo": "zoo",
};

function generateSmartAbbreviation(header: string): string {
    // Check if we have a predefined mapping
    if (DEFAULT_HEADER_MAPPINGS[header]) {
        return DEFAULT_HEADER_MAPPINGS[header];
    }
    
    // Break into words by camelCase, underscores, and other separators
    const words = header
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
        .replace(/[_-]/g, ' ') // underscores and hyphens
        .split(/\s+/)
        .filter(word => word.length > 0);
    
    if (words.length === 1) {
        const word = words[0];
        if (word.length <= 6) {
            return word;
        }
        // Single long word - use creative abbreviation
        return abbreviateWord(word);
    }
    
    // Multiple words - abbreviate each if needed
    return words.map(word => {
        if (word.length <= 6) {
            return word;
        }
        return abbreviateWord(word);
    }).join('');
}

function abbreviateWord(word: string): string {
    if (word.length <= 6) { return word; }
    
    // Common abbreviation patterns
    const abbreviations: { [key: string]: string } = {
        'minimum': 'Min',
        'maximum': 'Max', 
        'magic': 'Mag',
        'level': 'Lvl',
        'damage': 'Dmg',
        'requirement': 'Req',
        'strength': 'Str',
        'dexterity': 'Dex',
        'intelligence': 'Int',
        'vitality': 'Vit',
        'durability': 'Dur',
        'inventory': 'Inv',
        'graphics': 'Gfx',
        'function': 'Func',
        'server': 'Srv',
        'missile': 'Mis',
        'calculate': 'Calc',
        'program': 'Prg',
        'overlay': 'Ovl',
        'passive': 'Pass',
        'description': 'Desc',
        'character': 'Char',
        'alternative': 'Alt',
        'component': 'Comp',
        'stackable': 'Stack',
        'spawnable': 'Spawn',
        'transform': 'Trans',
        'upgrade': 'Upg',
        'nightmare': 'NM',
        'warning': 'Wrn'
    };
    
    const lower = word.toLowerCase();
    if (abbreviations[lower]) {
        return abbreviations[lower];
    }
    
    // Vowel removal strategy
    if (word.length > 8) {
        // Remove vowels except first letter and keep consonant clusters
        let result = word[0];
        for (let i = 1; i < word.length; i++) {
            const char = word[i];
            if (!/[aeiouAEIOU]/.test(char) || i === word.length - 1) {
                result += char;
            }
        }
        if (result.length <= 6) { return result; }
    }
    
    // Fallback: first 6 characters
    return word.substring(0, 6);
}

function generateSmartAbbreviationFromWords(header: string): string {
    // Break into words by camelCase, underscores, and other separators
    const words = header
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
        .replace(/[_-]/g, ' ') // underscores and hyphens
        .split(/\s+/)
        .filter(word => word.length > 0);
    
    if (words.length === 1) {
        const word = words[0];
        if (word.length <= 6) {
            return word;
        }
        // Single long word - use creative abbreviation
        return abbreviateWord(word);
    }
    
    // Multiple words - abbreviate each if needed
    return words.map(word => {
        if (word.length <= 6) {
            return word;
        }
        return abbreviateWord(word);
    }).join('');
}

export class D2TableViewerProvider {
    private static readonly viewType = 'd2TableViewer';
    private panels: Map<string, vscode.WebviewPanel> = new Map();

    constructor(private context: vscode.ExtensionContext) {}

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new D2TableViewerProvider(context);
        
        const command = vscode.commands.registerCommand('d2Modding.openTableViewer', async (item?: any) => {
            try {
                let uri: vscode.Uri | undefined;

                // Handle different calling contexts
                if (item && item.resourceUri) {
                    // Called from tree view context menu - item is DatasetItem
                    uri = item.resourceUri;
                } else if (item && typeof item === 'object' && item.fsPath) {
                    // Called with direct URI
                    uri = item;
                } else {
                    // Called from command palette - use active editor
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor && activeEditor.document.fileName.endsWith('.txt')) {
                        uri = activeEditor.document.uri;
                    } else {
                        vscode.window.showErrorMessage('Please open a TXT file to view as table');
                        return;
                    }
                }

                if (!uri) {
                    vscode.window.showErrorMessage('No valid file URI found');
                    return;
                }

                await provider.openTableViewer(uri);
            } catch (error) {
                vscode.window.showErrorMessage(`Error opening table viewer: ${error}`);
                console.error('Table viewer error:', error);
            }
        });

        return command;
    }

    private async openTableViewer(uri: vscode.Uri): Promise<void> {
        if (!uri || !uri.fsPath) {
            vscode.window.showErrorMessage('Invalid file URI provided');
            return;
        }

        const filePath = uri.fsPath;
        const fileName = filePath.split(/[\\/]/).pop() || 'table';
        
        // Enhanced title with D2 branding
        const panelTitle = `📊 D2 Table: ${fileName}`;

        // Check if panel already exists for this file
        let panel = this.panels.get(filePath);
        
        if (panel) {
            panel.reveal();
            return;
        }

        // Create new panel with enhanced title
        panel = vscode.window.createWebviewPanel(
            D2TableViewerProvider.viewType,
            panelTitle,
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        this.panels.set(filePath, panel);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'adjustColumnWidth':
                    await this.handleAdjustColumnWidth(panel, uri);
                    break;
                case 'toggleTextWrap':
                    await this.handleToggleTextWrap(panel, uri);
                    break;
                case 'configureHeaders':
                    await this.handleConfigureHeaders();
                    break;
                case 'openInEditor':
                    await vscode.commands.executeCommand('vscode.open', uri);
                    break;
                case 'toggleEditable':
                    // No server-side action needed, just acknowledge
                    break;
                case 'saveTableData':
                    await this.handleSaveTableData(message.data, uri);
                    break;
            }
        });

        // Clean up when panel is disposed
        panel.onDidDispose(() => {
            this.panels.delete(filePath);
        });

        // Load and display the table data
        await this.updateTableContent(panel, uri);

        // Watch for file changes
        const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath);
        watcher.onDidChange(() => {
            this.updateTableContent(panel!, uri);
        });

        // Watch for configuration changes
        const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('d2Modding.tableViewer.maxColumnWidth') ||
                e.affectsConfiguration('d2Modding.tableViewer.wrapText') ||
                e.affectsConfiguration('d2Modding.tableViewer.customHeaders')) {
                this.updateTableContent(panel!, uri);
            }
        });

        panel.onDidDispose(() => {
            watcher.dispose();
            configWatcher.dispose();
        });
    }

    private async handleAdjustColumnWidth(panel?: vscode.WebviewPanel, uri?: vscode.Uri): Promise<void> {
        const config = vscode.workspace.getConfiguration('d2Modding');
        const currentMaxWidth = config.get<number>('tableViewer.maxColumnWidth', 200);
        
        const newWidth = await vscode.window.showInputBox({
            prompt: 'Enter maximum column width (pixels)',
            value: currentMaxWidth.toString(),
            validateInput: (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 50 || num > 500) {
                    return 'Width must be between 50 and 500 pixels';
                }
                return null;
            }
        });

        if (newWidth) {
            const numericWidth = parseInt(newWidth);
            await config.update('tableViewer.maxColumnWidth', numericWidth, vscode.ConfigurationTarget.Workspace);
            
            // Refresh the table if panel and uri are provided
            if (panel && uri) {
                await this.updateTableContent(panel, uri);
                vscode.window.showInformationMessage(`Table Viewer max column width set to ${numericWidth}px and table refreshed.`);
            } else {
                vscode.window.showInformationMessage(`Table Viewer max column width set to ${numericWidth}px. Changes will apply to newly opened tables.`);
            }
        }
    }

    private async handleToggleTextWrap(panel: vscode.WebviewPanel, uri: vscode.Uri): Promise<void> {
        const config = vscode.workspace.getConfiguration('d2Modding');
        const currentWrapText = config.get<boolean>('tableViewer.wrapText', false);
        const newWrapText = !currentWrapText;
        
        await config.update('tableViewer.wrapText', newWrapText, vscode.ConfigurationTarget.Global);
        
        // Refresh the table to apply the new text wrap setting
        await this.updateTableContent(panel, uri);
        
        vscode.window.showInformationMessage(`Text wrapping ${newWrapText ? 'enabled' : 'disabled'} for table columns.`);
    }

    private async handleConfigureHeaders(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('d2Modding');
            const currentMappings = config.get<{ [key: string]: string }>('tableViewer.customHeaders', {});
            
            // Show QuickPick with options
            const options = [
                {
                    label: '🔧 Edit Custom Headers',
                    description: 'Open settings to edit custom header mappings',
                    action: 'edit'
                },
                {
                    label: '🔄 Reset to Defaults',
                    description: 'Reset all headers to default abbreviations',
                    action: 'reset'
                },
                {
                    label: '📋 Copy Default Mappings',
                    description: 'Copy default header mappings to clipboard for editing',
                    action: 'copy'
                }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Choose header configuration action',
                title: 'Configure Custom Headers'
            });

            if (!selected) { return; }

            switch (selected.action) {
                case 'edit':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'd2Modding.tableViewer.customHeaders');
                    break;
                case 'reset':
                    await config.update('tableViewer.customHeaders', {}, vscode.ConfigurationTarget.Global);
                    vscode.window.showInformationMessage('Header mappings reset to defaults. Refresh tables to see changes.');
                    break;
                case 'copy':
                    const mappingsText = JSON.stringify(DEFAULT_HEADER_MAPPINGS, null, 2);
                    await vscode.env.clipboard.writeText(mappingsText);
                    vscode.window.showInformationMessage('Default header mappings copied to clipboard!');
                    break;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error configuring headers: ${error}`);
        }
    }

    private async handleSaveTableData(tableData: any, uri: vscode.Uri): Promise<void> {
        try {
            if (!uri || !uri.fsPath) {
                throw new Error('Invalid file URI for saving');
            }

            // Convert the table data back to TSV format
            const lines: string[] = [];
            
            // Add header row
            lines.push(tableData.headers.join('\t'));
            
            // Add data rows
            tableData.rows.forEach((row: string[]) => {
                lines.push(row.join('\t'));
            });
            
            // Write to file
            const content = lines.join('\n');
            await fs.promises.writeFile(uri.fsPath, content, 'utf8');
            
            vscode.window.showInformationMessage(`Table data saved to ${uri.fsPath}`);
        } catch (error) {
            console.error('Error saving table data:', error);
            vscode.window.showErrorMessage(`Failed to save table data: ${error}`);
        }
    }

    private async updateTableContent(panel: vscode.WebviewPanel, uri: vscode.Uri): Promise<void> {
        try {
            if (!uri || !uri.fsPath) {
                throw new Error('Invalid URI provided to updateTableContent');
            }
            
            const tableData = await this.parseTableData(uri);
            panel.webview.html = this.generateTableHTML(tableData);
        } catch (error) {
            console.error('Error updating table content:', error);
            panel.webview.html = this.generateErrorHTML(`Error loading table: ${error}`);
        }
    }

    private async parseTableData(uri: vscode.Uri): Promise<TableData> {
        if (!uri || !uri.fsPath) {
            throw new Error('Invalid file URI');
        }

        const content = await fs.promises.readFile(uri.fsPath, 'utf8');
        if (!content) {
            throw new Error('File content is empty or could not be read');
        }

        const lines = content.split('\n').filter(line => line.trim().length > 0);
        
        if (lines.length === 0) {
            throw new Error('File is empty');
        }

        // Parse header row
        const headerRow = lines[0].split('\t');
        const dataRows = lines.slice(1).map(line => line.split('\t'));

        // Get max column width from configuration
        const config = vscode.workspace.getConfiguration('d2Modding');
        const maxColumnWidth = config.get<number>('tableViewer.maxColumnWidth', 200);

        // Analyze columns to determine types and optimal widths
        const columns: TableColumn[] = headerRow.map((header, index) => {
            const columnData = dataRows.map(row => row[index] || '');
            const originalHeader = (header || '').trim();
            
            // Get custom header mappings from settings
            const headerMappings = config.get<{ [key: string]: string }>('tableViewer.customHeaders', {});
            
            // Use custom header first, then default mappings, then generate smart abbreviation
            const displayHeader = headerMappings[originalHeader] || 
                                DEFAULT_HEADER_MAPPINGS[originalHeader] || 
                                generateSmartAbbreviationFromWords(originalHeader);
            
            // Calculate tight-fitting width based on actual content
            const maxCellCharCount = Math.max(
                displayHeader.length, // Use the actual display header length, not original
                ...columnData.map(cell => (cell || '').length)
            );
            
            // More precise character width calculation for tight fitting
            // Use 7px per character for monospace font + 8px padding (4px each side)
            const tightWidth = Math.max(
                maxCellCharCount * 7 + 8, // 7px per char + padding
                40 // Absolute minimum width for usability
            );
            
            // Determine data type
            let type: 'text' | 'number' | 'boolean' = 'text';
            const validCells = columnData.filter(cell => cell && cell.trim() !== '');
            if (validCells.length > 0 && validCells.every(cell => !isNaN(Number(cell)))) {
                type = 'number';
            } else if (validCells.every(cell => ['true', 'false', 'yes', 'no', '1', '0'].includes(cell.toLowerCase()))) {
                type = 'boolean';
            }

            // Determine alignment
            let align: 'left' | 'center' | 'right' = 'left';
            if (type === 'number') {
                align = 'right';
            } else if (type === 'boolean') {
                align = 'center';
            }

            // Apply maximum width constraint only if needed
            const constrainedWidth = Math.min(tightWidth, maxColumnWidth);

            return {
                header: displayHeader,
                originalHeader: originalHeader,
                width: constrainedWidth,
                align,
                type
            };
        });

        return {
            columns,
            rows: dataRows,
            fileName: uri.fsPath ? (uri.fsPath.split(/[\\/]/).pop() || 'table') : 'table',
            filePath: uri.fsPath
        };
    }

    private generateTableHTML(data: TableData): string {
        const columnWidths = data.columns.map(col => col.width);
        const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0) + (data.columns.length * 2); // borders and spacing
        
        // Get configuration settings
        const config = vscode.workspace.getConfiguration('d2Modding');
        const maxColumnWidth = config.get<number>('tableViewer.maxColumnWidth', 200);
        const wrapText = config.get<boolean>('tableViewer.wrapText', false);
            return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>D2 Table Viewer - ${data.fileName}</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        overflow-x: auto;
                    }
                
                    .table-header {
                        margin-bottom: 10px;
                        padding: 10px;
                        background-color: var(--vscode-titleBar-activeBackground);
                        border-radius: 4px;
                    }
                
                    .table-stats {
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 5px;
                    }
                
                    .table-container {
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 4px;
                        overflow-x: auto;
                        overflow-y: auto;
                        background-color: var(--vscode-editor-background);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        max-height: 80vh;
                    }
                
                    table {
                        min-width: max-content;
                        border-collapse: collapse;
                        font-size: 14px;
                        line-height: 1.4;
                    }
                
                    th {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                        font-weight: bold;
                        padding: 2px 6px;
                        border: 1px solid var(--vscode-widget-border);
                        border-bottom: 2px solid var(--vscode-widget-border);
                        position: sticky;
                        text-align: center;
                        top: 0;
                        z-index: 10;
                        white-space: nowrap;
                    }
                    
                    th.sticky-col {
                        position: sticky;
                        left: 0;
                        z-index: 12;
                        background-color: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                        font-weight: bold;
                        border-right: 2px solid var(--vscode-widget-border);
                        border-bottom: 2px solid var(--vscode-widget-border);
                        padding: 2px 6px;
                        white-space: nowrap;
                    }
                    
                    td.sticky-col {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        border-right: 2px solid var(--vscode-widget-border);
                        padding: 2px 6px;
                        color: var(--vscode-list-activeSelectionForeground);
                        font-weight: bold;
                        position: sticky;
                        left: 0;
                        z-index: 11;
                        white-space: nowrap;
                    }
                
                    td {
                        border: 1px solid var(--vscode-widget-border);
                        border-bottom: 1px solid var(--vscode-widget-border);
                        padding: 2px 6px;
                        ${wrapText ? 'white-space: normal; word-wrap: break-word;' : 'white-space: nowrap;'}
                        overflow: hidden;
                        ${!wrapText ? 'text-overflow: clip;' : ''}
                        text-align: right;
                        vertical-align: top;
                    }
                
                    tr:nth-child(even) {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                
                    tr:hover {
                        background-color: purple;
                    }
                
                    .toolbar {
                        margin-bottom: 10px;
                        display: flex;
                        gap: 10px;
                        align-items: center;
                    }
                
                    .toolbar button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 12px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                
                    .toolbar button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                
                    .search-box {
                        padding: 4px 8px;
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 3px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="table-header">
                    <h3>📊 ${data.fileName}</h3>
                    <div class="table-stats">
                        ${data.rows.length} rows × ${data.columns.length} columns | 
                        Max column width: ${maxColumnWidth}px | 
                        File: ${data.filePath}
                    </div>
                </div>
            
                <div class="toolbar">
                    <input type="text" class="search-box" placeholder="Search table..." id="searchBox">
                    <button onclick="adjustColumnWidth()">📏 Adjust Max Width</button>
                    <button onclick="toggleTextWrap()" id="wrapButton">${wrapText ? '📖 Disable Wrap' : '📑 Enable Wrap'}</button>
                    <button onclick="configureHeaders()">🏷️ Configure Headers</button>
                    <button onclick="toggleEditable()" id="editButton">✏️ Make Editable</button>
                    <button onclick="saveTable()" id="saveButton" style="display: none;">💾 Save Changes</button>
                    <button onclick="exportToCSV()">📄 Export CSV</button>
                    <button onclick="copyTable()">📋 Copy Table</button>
                    <button onclick="openInEditor()">📝 Edit Source</button>
                </div>
            
                <div class="table-container">
                    <table id="dataTable">
                        <thead>
                            <tr>
                                
                                ${data.columns.map((col, index) => `
                                    <th class="col-${col.type}${index === 0 ? ' sticky-col' : ''}" 
                                        style="width: ${col.width}px; max-width: ${col.width}px;"
                                        title="${col.originalHeader}">
                                        ${col.header}
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.rows.map((row, rowIdx) => `
                                <tr>
                                    
                                    ${row.map((cell, index) => {
                                        const column = data.columns[index];
                                        return `<td class="col-${column.type}${index === 0 ? ' sticky-col' : ''}" style="width: ${column.width}px; max-width: ${column.width}px;" title="${cell}">${cell}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                // Search functionality
                document.getElementById('searchBox').addEventListener('input', function(e) {
                    const searchTerm = e.target.value.toLowerCase();
                    const rows = document.querySelectorAll('#dataTable tbody tr');
                    
                    rows.forEach(row => {
                        const text = row.textContent.toLowerCase();
                        row.style.display = text.includes(searchTerm) ? '' : 'none';
                    });
                });
                
                function exportToCSV() {
                    vscode.postMessage({ command: 'exportCSV' });
                }
                
                function copyTable() {
                    const table = document.getElementById('dataTable');
                    const range = document.createRange();
                    range.selectNode(table);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    document.execCommand('copy');
                    window.getSelection().removeAllRanges();
                }
                
                function adjustColumnWidth() {
                    vscode.postMessage({ command: 'adjustColumnWidth' });
                }
                
                function toggleTextWrap() {
                    vscode.postMessage({ command: 'toggleTextWrap' });
                }
                
                function toggleEditable() {
                    const button = document.getElementById('editButton');
                    const saveButton = document.getElementById('saveButton');
                    const cells = document.querySelectorAll('#dataTable tbody td');
                    const isCurrentlyEditable = button.textContent.includes('Lock');
                    
                    if (isCurrentlyEditable) {
                        // Make non-editable
                        cells.forEach(cell => {
                            cell.contentEditable = 'false';
                            cell.classList.remove('editable');
                        });
                        button.textContent = '✏️ Make Editable';
                        button.title = 'Make table cells editable';
                        saveButton.style.display = 'none';
                    } else {
                        // Make editable
                        cells.forEach(cell => {
                            cell.contentEditable = 'true';
                            cell.classList.add('editable');
                            
                            // Add click event to select all content when cell is clicked
                            cell.addEventListener('click', function() {
                                if (this.contentEditable === 'true') {
                                    const range = document.createRange();
                                    range.selectNodeContents(this);
                                    const selection = window.getSelection();
                                    selection.removeAllRanges();
                                    selection.addRange(range);
                                }
                            });
                            
                            // Add input event to track changes
                            cell.addEventListener('input', function() {
                                markAsChanged();
                            });
                            
                            // Add keydown event to handle Enter key and prevent newlines
                            cell.addEventListener('keydown', function(e) {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    // Move to next cell (same column, next row)
                                    const currentRow = this.parentNode;
                                    const currentCellIndex = Array.from(currentRow.children).indexOf(this);
                                    const nextRow = currentRow.nextElementSibling;
                                    
                                    if (nextRow && nextRow.children[currentCellIndex]) {
                                        const nextCell = nextRow.children[currentCellIndex];
                                        nextCell.focus();
                                        // Select all content in the next cell
                                        const range = document.createRange();
                                        range.selectNodeContents(nextCell);
                                        const selection = window.getSelection();
                                        selection.removeAllRanges();
                                        selection.addRange(range);
                                    }
                                }
                            });
                            
                            // Prevent pasting content with newlines
                            cell.addEventListener('paste', function(e) {
                                e.preventDefault();
                                const paste = (e.clipboardData || window.clipboardData).getData('text');
                                const cleanPaste = paste.replace(/\\r?\\n/g, ' ').trim();
                                document.execCommand('insertText', false, cleanPaste);
                                markAsChanged();
                            });
                        });
                        button.textContent = '🔒 Lock Editing';
                        button.title = 'Lock table cells from editing';
                        saveButton.style.display = 'inline-block';
                    }
                    
                    vscode.postMessage({ command: 'toggleEditable' });
                }
                
                function markAsChanged() {
                    const saveButton = document.getElementById('saveButton');
                    saveButton.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
                    saveButton.style.color = 'var(--vscode-button-secondaryForeground)';
                    saveButton.textContent = '💾 Save Changes *';
                }
                
                function saveTable() {
                    const headers = [];
                    const rows = [];
                    
                    // Get headers
                    const headerCells = document.querySelectorAll('#dataTable thead th');
                    headerCells.forEach(cell => {
                        headers.push(cell.textContent.trim());
                    });
                    
                    // Get data rows
                    const dataRows = document.querySelectorAll('#dataTable tbody tr');
                    dataRows.forEach(row => {
                        const rowData = [];
                        const cells = row.querySelectorAll('td');
                        cells.forEach(cell => {
                            rowData.push(cell.textContent.trim());
                        });
                        rows.push(rowData);
                    });
                    
                    // Send data to extension
                    vscode.postMessage({ 
                        command: 'saveTableData',
                        data: { headers, rows }
                    });
                    
                    // Reset save button state
                    const saveButton = document.getElementById('saveButton');
                    saveButton.style.backgroundColor = 'var(--vscode-button-background)';
                    saveButton.style.color = 'var(--vscode-button-foreground)';
                    saveButton.textContent = '💾 Save Changes';
                }
                
                function configureHeaders() {
                    vscode.postMessage({ command: 'configureHeaders' });
                }
                
                function openInEditor() {
                    vscode.postMessage({ command: 'openInEditor' });
                }
            </script>
        </body>
        </html>`;
    }

    private generateErrorHTML(error: string): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>D2 Table Viewer - Error</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    padding: 20px;
                }
                .error {
                    background-color: var(--vscode-inputValidation-errorBackground);
                    border: 1px solid var(--vscode-inputValidation-errorBorder);
                    padding: 15px;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="error">
                <h3>❌ Error Loading Table</h3>
                <p>${error}</p>
            </div>
        </body>
        </html>`;
    }
}
