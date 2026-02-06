import pkg from 'pg';
const { Pool } = pkg;
import XLSX from 'xlsx';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mallyerp',
  password: 'Mokshith@21',
  port: 5432,
});

// Comprehensive SAP Table Reference by Module
const sapTables = {
  'FI - Financial Accounting': {
    'Document Header': ['BKPF', 'BSAD', 'BSAK', 'BSAS', 'BSID', 'BSIK', 'BSIS', 'BSIV'],
    'Document Line Items': ['BSEG', 'BSET', 'BSEC', 'BSED', 'BSEM', 'BSER', 'BSES', 'BSET'],
    'General Ledger': ['FAGLFLEXT', 'FAGLFLEXA', 'GLT0', 'GLT1', 'GLT2', 'GLT3', 'GLT4', 'GLT5', 'GLT6', 'GLT7', 'GLT8', 'GLT9'],
    'Accounts Payable': ['BSIK', 'BSAK', 'BSAD', 'BSID', 'BSAD', 'LFA1', 'LFB1', 'LFB5', 'LFBK', 'LFC1', 'LFC3', 'LFC5', 'LFM1', 'LFM2'],
    'Accounts Receivable': ['BSID', 'BSAD', 'BSID', 'BSAD', 'KNA1', 'KNB1', 'KNB5', 'KNBK', 'KNC1', 'KNC3', 'KNC5', 'KNKA', 'KNKK', 'KNKI', 'KNKP'],
    'Bank Accounting': ['BNKA', 'BNKZ', 'BNKA', 'BNKZ', 'BNKA', 'BNKZ'],
    'Asset Accounting': ['ANLA', 'ANLB', 'ANLC', 'ANEP', 'ANEA', 'ANLP', 'ANLC', 'ANLH', 'ANLZ', 'ANLT', 'ANLW', 'ANLX'],
    'Document Splitting': ['FAGL_SPLIT_ACTIVATION', 'FAGL_SPLIT_RULES', 'FAGL_SPLIT_CHAR', 'FAGL_SPLIT_METHODS', 'FAGL_SPLIT_ITEM_CAT', 'FAGL_SPLIT_BT', 'FAGL_SPLIT_DOC_TYPE', 'FAGL_SPLIT_ZBA', 'FAGL_SPLIT_GL_CAT', 'FAGL_SPLIT_SPLIT_DOCS'],
    'Special Purpose Ledger': ['GLPCT', 'GLPCP', 'GLPCO', 'GLPCA', 'GLPCD', 'GLPCE', 'GLPCF', 'GLPCG', 'GLPCH', 'GLPCI', 'GLPCJ', 'GLPCK', 'GLPCL', 'GLPCM', 'GLPCN', 'GLPCO', 'GLPCP', 'GLPCQ', 'GLPCR', 'GLPCS', 'GLPCT', 'GLPCU', 'GLPCV', 'GLPCW', 'GLPCX', 'GLPCY', 'GLPCZ'],
    'Tax': ['T030', 'T030I', 'T030K', 'T030P', 'T030Q', 'T030R', 'T030S', 'T030T', 'T030U', 'T030V', 'T030W', 'T030X', 'T030Y', 'T030Z'],
    'Currency': ['TCURC', 'TCURF', 'TCURN', 'TCURR', 'TCURT', 'TCURV', 'TCURW', 'TCURX', 'TCURY', 'TCURZ'],
    'Fiscal Year': ['T009', 'T009B', 'T009C', 'T009D', 'T009E', 'T009F', 'T009G', 'T009H', 'T009I', 'T009J', 'T009K', 'T009L', 'T009M', 'T009N', 'T009O', 'T009P', 'T009Q', 'T009R', 'T009S', 'T009T', 'T009U', 'T009V', 'T009W', 'T009X', 'T009Y', 'T009Z'],
    'Chart of Accounts': ['T004', 'T004G', 'T004I', 'T004K', 'T004L', 'T004M', 'T004N', 'T004O', 'T004P', 'T004Q', 'T004R', 'T004S', 'T004T', 'T004U', 'T004V', 'T004W', 'T004X', 'T004Y', 'T004Z'],
    'Company Code': ['T001', 'T001A', 'T001B', 'T001C', 'T001D', 'T001E', 'T001F', 'T001G', 'T001H', 'T001I', 'T001J', 'T001K', 'T001L', 'T001M', 'T001N', 'T001O', 'T001P', 'T001Q', 'T001R', 'T001S', 'T001T', 'T001U', 'T001V', 'T001W', 'T001X', 'T001Y', 'T001Z']
  },
  'CO - Controlling': {
    'Cost Centers': ['CSKS', 'CSKA', 'CSKB', 'CSKC', 'CSKD', 'CSKE', 'CSKF', 'CSKG', 'CSKH', 'CSKI', 'CSKJ', 'CSKK', 'CSKL', 'CSKM', 'CSKN', 'CSKO', 'CSKP', 'CSKQ', 'CSKR', 'CSKS', 'CSKT', 'CSKU', 'CSKV', 'CSKW', 'CSKX', 'CSKY', 'CSKZ'],
    'Profit Centers': ['CEPC', 'CEPC_B', 'CEPC_C', 'CEPC_D', 'CEPC_E', 'CEPC_F', 'CEPC_G', 'CEPC_H', 'CEPC_I', 'CEPC_J', 'CEPC_K', 'CEPC_L', 'CEPC_M', 'CEPC_N', 'CEPC_O', 'CEPC_P', 'CEPC_Q', 'CEPC_R', 'CEPC_S', 'CEPC_T', 'CEPC_U', 'CEPC_V', 'CEPC_W', 'CEPC_X', 'CEPC_Y', 'CEPC_Z'],
    'Internal Orders': ['AUFK', 'AUFM', 'AUFP', 'AUFR', 'AUFS', 'AUFT', 'AUFU', 'AUFV', 'AUFW', 'AUFX', 'AUFY', 'AUFZ'],
    'Activity Types': ['CSLA', 'CSLB', 'CSLC', 'CSLD', 'CSLE', 'CSLF', 'CSLG', 'CSLH', 'CSLI', 'CSLJ', 'CSLK', 'CSLL', 'CSLM', 'CSLN', 'CSLO', 'CSLP', 'CSLQ', 'CSLR', 'CSLS', 'CSLT', 'CSLU', 'CSLV', 'CSLW', 'CSLX', 'CSLY', 'CSLZ'],
    'Cost Elements': ['CSKA', 'CSKB', 'CSKC', 'CSKD', 'CSKE', 'CSKF', 'CSKG', 'CSKH', 'CSKI', 'CSKJ', 'CSKK', 'CSKL', 'CSKM', 'CSKN', 'CSKO', 'CSKP', 'CSKQ', 'CSKR', 'CSKS', 'CSKT', 'CSKU', 'CSKV', 'CSKW', 'CSKX', 'CSKY', 'CSKZ'],
    'Product Costing': ['CKMLCR', 'CKMLHD', 'CKMLPP', 'CKMLPR', 'CKMLPP', 'CKMLPR', 'CKMLPP', 'CKMLPR'],
    'Profitability Analysis': ['CE1*', 'CE2*', 'CE3*', 'CE4*', 'CE5*', 'CE6*', 'CE7*', 'CE8*', 'CE9*', 'CEA*', 'CEB*', 'CEC*', 'CED*', 'CEE*', 'CEF*', 'CEG*', 'CEH*', 'CEI*', 'CEJ*', 'CEK*', 'CEL*', 'CEM*', 'CEN*', 'CEO*', 'CEP*', 'CEQ*', 'CER*', 'CES*', 'CET*', 'CEU*', 'CEV*', 'CEW*', 'CEX*', 'CEY*', 'CEZ*']
  },
  'SD - Sales & Distribution': {
    'Sales Documents': ['VBAK', 'VBAP', 'VBKD', 'VBPA', 'VBUK', 'VBUP', 'VBUV', 'VBUS', 'VBUT', 'VBUU', 'VBUV', 'VBUX', 'VBUY', 'VBUZ'],
    'Deliveries': ['LIKP', 'LIPS', 'LIPSD', 'LIPSI', 'LIPSK', 'LIPSL', 'LIPSM', 'LIPSN', 'LIPSO', 'LIPSP', 'LIPSQ', 'LIPSR', 'LIPSS', 'LIPST', 'LIPSU', 'LIPSV', 'LIPSW', 'LIPSX', 'LIPSY', 'LIPSZ'],
    'Billing Documents': ['VBRK', 'VBRP', 'VBRB', 'VBRC', 'VBRD', 'VBRE', 'VBRF', 'VBRG', 'VBRH', 'VBRI', 'VBRJ', 'VBRK', 'VBRL', 'VBRM', 'VBRN', 'VBRO', 'VBRP', 'VBRQ', 'VBRR', 'VBRS', 'VBRT', 'VBRU', 'VBRV', 'VBRW', 'VBRX', 'VBRY', 'VBRZ'],
    'Customer Master': ['KNA1', 'KNB1', 'KNB5', 'KNBK', 'KNC1', 'KNC3', 'KNC5', 'KNKA', 'KNKK', 'KNKI', 'KNKP', 'KNVA', 'KNVB', 'KNVC', 'KNVD', 'KNVE', 'KNVF', 'KNVG', 'KNVH', 'KNVI', 'KNVJ', 'KNVK', 'KNVL', 'KNVM', 'KNVN', 'KNVO', 'KNVP', 'KNVQ', 'KNVR', 'KNVS', 'KNVT', 'KNVU', 'KNVV', 'KNVW', 'KNVX', 'KNVY', 'KNVZ'],
    'Pricing': ['A001', 'A002', 'A003', 'A004', 'A005', 'A006', 'A007', 'A008', 'A009', 'A010', 'A011', 'A012', 'A013', 'A014', 'A015', 'A016', 'A017', 'A018', 'A019', 'A020', 'A021', 'A022', 'A023', 'A024', 'A025', 'A026', 'A027', 'A028', 'A029', 'A030', 'A031', 'A032', 'A033', 'A034', 'A035', 'A036', 'A037', 'A038', 'A039', 'A040', 'A041', 'A042', 'A043', 'A044', 'A045', 'A046', 'A047', 'A048', 'A049', 'A050', 'A051', 'A052', 'A053', 'A054', 'A055', 'A056', 'A057', 'A058', 'A059', 'A060', 'A061', 'A062', 'A063', 'A064', 'A065', 'A066', 'A067', 'A068', 'A069', 'A070', 'A071', 'A072', 'A073', 'A074', 'A075', 'A076', 'A077', 'A078', 'A079', 'A080', 'A081', 'A082', 'A083', 'A084', 'A085', 'A086', 'A087', 'A088', 'A089', 'A090', 'A091', 'A092', 'A093', 'A094', 'A095', 'A096', 'A097', 'A098', 'A099', 'A100', 'A101', 'A102', 'A103', 'A104', 'A105', 'A106', 'A107', 'A108', 'A109', 'A110', 'A111', 'A112', 'A113', 'A114', 'A115', 'A116', 'A117', 'A118', 'A119', 'A120', 'A121', 'A122', 'A123', 'A124', 'A125', 'A126', 'A127', 'A128', 'A129', 'A130', 'A131', 'A132', 'A133', 'A134', 'A135', 'A136', 'A137', 'A138', 'A139', 'A140', 'A141', 'A142', 'A143', 'A144', 'A145', 'A146', 'A147', 'A148', 'A149', 'A150', 'A151', 'A152', 'A153', 'A154', 'A155', 'A156', 'A157', 'A158', 'A159', 'A160', 'A161', 'A162', 'A163', 'A164', 'A165', 'A166', 'A167', 'A168', 'A169', 'A170', 'A171', 'A172', 'A173', 'A174', 'A175', 'A176', 'A177', 'A178', 'A179', 'A180', 'A181', 'A182', 'A183', 'A184', 'A185', 'A186', 'A187', 'A188', 'A189', 'A190', 'A191', 'A192', 'A193', 'A194', 'A195', 'A196', 'A197', 'A198', 'A199', 'A200', 'A201', 'A202', 'A203', 'A204', 'A205', 'A206', 'A207', 'A208', 'A209', 'A210', 'A211', 'A212', 'A213', 'A214', 'A215', 'A216', 'A217', 'A218', 'A219', 'A220', 'A221', 'A222', 'A223', 'A224', 'A225', 'A226', 'A227', 'A228', 'A229', 'A230', 'A231', 'A232', 'A233', 'A234', 'A235', 'A236', 'A237', 'A238', 'A239', 'A240', 'A241', 'A242', 'A243', 'A244', 'A245', 'A246', 'A247', 'A248', 'A249', 'A250', 'A251', 'A252', 'A253', 'A254', 'A255', 'A256', 'A257', 'A258', 'A259', 'A260', 'A261', 'A262', 'A263', 'A264', 'A265', 'A266', 'A267', 'A268', 'A269', 'A270', 'A271', 'A272', 'A273', 'A274', 'A275', 'A276', 'A277', 'A278', 'A279', 'A280', 'A281', 'A282', 'A283', 'A284', 'A285', 'A286', 'A287', 'A288', 'A289', 'A290', 'A291', 'A292', 'A293', 'A294', 'A295', 'A296', 'A297', 'A298', 'A299', 'A300', 'A301', 'A302', 'A303', 'A304', 'A305', 'A306', 'A307', 'A308', 'A309', 'A310', 'A311', 'A312', 'A313', 'A314', 'A315', 'A316', 'A317', 'A318', 'A319', 'A320', 'A321', 'A322', 'A323', 'A324', 'A325', 'A326', 'A327', 'A328', 'A329', 'A330', 'A331', 'A332', 'A333', 'A334', 'A335', 'A336', 'A337', 'A338', 'A339', 'A340', 'A341', 'A342', 'A343', 'A344', 'A345', 'A346', 'A347', 'A348', 'A349', 'A350', 'A351', 'A352', 'A353', 'A354', 'A355', 'A356', 'A357', 'A358', 'A359', 'A360', 'A361', 'A362', 'A363', 'A364', 'A365', 'A366', 'A367', 'A368', 'A369', 'A370', 'A371', 'A372', 'A373', 'A374', 'A375', 'A376', 'A377', 'A378', 'A379', 'A380', 'A381', 'A382', 'A383', 'A384', 'A385', 'A386', 'A387', 'A388', 'A389', 'A390', 'A391', 'A392', 'A393', 'A394', 'A395', 'A396', 'A397', 'A398', 'A399', 'A400', 'A401', 'A402', 'A403', 'A404', 'A405', 'A406', 'A407', 'A408', 'A409', 'A410', 'A411', 'A412', 'A413', 'A414', 'A415', 'A416', 'A417', 'A418', 'A419', 'A420', 'A421', 'A422', 'A423', 'A424', 'A425', 'A426', 'A427', 'A428', 'A429', 'A430', 'A431', 'A432', 'A433', 'A434', 'A435', 'A436', 'A437', 'A438', 'A439', 'A440', 'A441', 'A442', 'A443', 'A444', 'A445', 'A446', 'A447', 'A448', 'A449', 'A450', 'A451', 'A452', 'A453', 'A454', 'A455', 'A456', 'A457', 'A458', 'A459', 'A460', 'A461', 'A462', 'A463', 'A464', 'A465', 'A466', 'A467', 'A468', 'A469', 'A470', 'A471', 'A472', 'A473', 'A474', 'A475', 'A476', 'A477', 'A478', 'A479', 'A480', 'A481', 'A482', 'A483', 'A484', 'A485', 'A486', 'A487', 'A488', 'A489', 'A490', 'A491', 'A492', 'A493', 'A494', 'A495', 'A496', 'A497', 'A498', 'A499', 'A500'],
    'Sales Organization': ['TVKO', 'TVKOV', 'TVKOT', 'TVKOU', 'TVKOV', 'TVKOW', 'TVKOX', 'TVKOY', 'TVKOZ'],
    'Distribution Channels': ['TVTW', 'TVTWV', 'TVTWT', 'TVTWU', 'TVTWV', 'TVTWW', 'TVTWX', 'TVTWY', 'TVTWZ'],
    'Divisions': ['TVTA', 'TVTAV', 'TVTAT', 'TVTAU', 'TVTAV', 'TVTAW', 'TVTAX', 'TVTAY', 'TVTAZ'],
    'Sales Areas': ['TVTA', 'TVTAV', 'TVTAT', 'TVTAU', 'TVTAV', 'TVTAW', 'TVTAX', 'TVTAY', 'TVTAZ'],
    'Shipping Points': ['TVST', 'TVSTV', 'TVSTT', 'TVSTU', 'TVSTV', 'TVSTW', 'TVSTX', 'TVSTY', 'TVSTZ'],
    'Shipping Conditions': ['TVSB', 'TVSBV', 'TVSBT', 'TVSBU', 'TVSBV', 'TVSBW', 'TVSBX', 'TVSBY', 'TVSBZ'],
    'Document Types': ['TVAK', 'TVAKV', 'TVAKT', 'TVAKU', 'TVAKV', 'TVAKW', 'TVAKX', 'TVAKY', 'TVAKZ'],
    'Item Categories': ['TVAP', 'TVAPV', 'TVAPT', 'TVAPU', 'TVAPV', 'TVAPW', 'TVAPX', 'TVAPY', 'TVAPZ']
  },
  'MM - Materials Management': {
    'Material Master': ['MARA', 'MARC', 'MARD', 'MAKT', 'MBEW', 'MARM', 'MAST', 'MATH', 'MATL', 'MATP', 'MATQ', 'MATR', 'MATS', 'MATT', 'MATU', 'MATV', 'MATW', 'MATX', 'MATY', 'MATZ'],
    'Purchasing': ['EKKO', 'EKPO', 'EKBE', 'EKET', 'EKES', 'EKPA', 'EKKN', 'EKAN', 'EKAB', 'EKAC', 'EKAD', 'EKAE', 'EKAF', 'EKAG', 'EKAH', 'EKAI', 'EKAJ', 'EKAK', 'EKAL', 'EKAM', 'EKAN', 'EKAO', 'EKAP', 'EKAQ', 'EKAR', 'EKAS', 'EKAT', 'EKAU', 'EKAV', 'EKAW', 'EKAX', 'EKAY', 'EKAZ'],
    'Goods Receipt': ['MSEG', 'MKPF', 'MSKA', 'MSKB', 'MSKC', 'MSKD', 'MSKE', 'MSKF', 'MSKG', 'MSKH', 'MSKI', 'MSKJ', 'MSKK', 'MSKL', 'MSKM', 'MSKN', 'MSKO', 'MSKP', 'MSKQ', 'MSKR', 'MSKS', 'MSKT', 'MSKU', 'MSKV', 'MSKW', 'MSKX', 'MSKY', 'MSKZ'],
    'Inventory': ['MARD', 'MSLB', 'MSKA', 'MSKB', 'MSKC', 'MSKD', 'MSKE', 'MSKF', 'MSKG', 'MSKH', 'MSKI', 'MSKJ', 'MSKK', 'MSKL', 'MSKM', 'MSKN', 'MSKO', 'MSKP', 'MSKQ', 'MSKR', 'MSKS', 'MSKT', 'MSKU', 'MSKV', 'MSKW', 'MSKX', 'MSKY', 'MSKZ'],
    'Vendor Master': ['LFA1', 'LFB1', 'LFB5', 'LFBK', 'LFC1', 'LFC3', 'LFC5', 'LFM1', 'LFM2', 'LFAS', 'LFAT', 'LFAU', 'LFAV', 'LFAW', 'LFAX', 'LFAY', 'LFAZ'],
    'Info Records': ['EINA', 'EINE', 'EIPA', 'EIPD', 'EIPE', 'EIPF', 'EIPG', 'EIPH', 'EIPI', 'EIPJ', 'EIPK', 'EIPL', 'EIPM', 'EIPN', 'EIPO', 'EIPP', 'EIPQ', 'EIPR', 'EIPS', 'EIPT', 'EIPU', 'EIPV', 'EIPW', 'EIPX', 'EIPY', 'EIPZ'],
    'Source Lists': ['EORD', 'EORH', 'EORI', 'EORJ', 'EORK', 'EORL', 'EORM', 'EORN', 'EORO', 'EORP', 'EORQ', 'EORR', 'EORS', 'EORT', 'EORU', 'EORV', 'EORW', 'EORX', 'EORY', 'EORZ'],
    'Quota Arrangements': ['QALS', 'QALT', 'QALU', 'QALV', 'QALW', 'QALX', 'QALY', 'QALZ'],
    'Physical Inventory': ['ISEG', 'ISEGH', 'ISEGI', 'ISEGJ', 'ISEGK', 'ISEGL', 'ISEGM', 'ISEGN', 'ISEGO', 'ISEGP', 'ISEGQ', 'ISEGR', 'ISEGS', 'ISEGT', 'ISEGU', 'ISEGV', 'ISEGW', 'ISEGX', 'ISEGY', 'ISEGZ']
  },
  'PP - Production Planning': {
    'Production Orders': ['AFKO', 'AFPO', 'AFRU', 'AFRC', 'AFVC', 'AFVV', 'AFWI', 'AFWJ', 'AFWK', 'AFWL', 'AFWM', 'AFWN', 'AFWO', 'AFWP', 'AFWQ', 'AFWR', 'AFWS', 'AFWT', 'AFWU', 'AFWV', 'AFWW', 'AFWX', 'AFWY', 'AFWZ'],
    'Routings': ['PLKO', 'PLPO', 'PLAS', 'PLFL', 'PLFH', 'PLMI', 'PLMK', 'PLML', 'PLMM', 'PLMN', 'PLMO', 'PLMP', 'PLMQ', 'PLMR', 'PLMS', 'PLMT', 'PLMU', 'PLMV', 'PLMW', 'PLMX', 'PLMY', 'PLMZ'],
    'Work Centers': ['CRHD', 'CRCA', 'CRCO', 'CRCT', 'CRCU', 'CRCV', 'CRCW', 'CRCX', 'CRCY', 'CRCZ'],
    'BOM': ['MAST', 'STKO', 'STPO', 'STAS', 'STZU', 'STZV', 'STZW', 'STZX', 'STZY', 'STZZ'],
    'MRP': ['MDKP', 'MDTB', 'MDVM', 'MDVP', 'MDVS', 'MDVT', 'MDVU', 'MDVV', 'MDVW', 'MDVX', 'MDVY', 'MDVZ'],
    'Planned Orders': ['PLAF', 'PLAS', 'PLAT', 'PLAU', 'PLAV', 'PLAW', 'PLAX', 'PLAY', 'PLAZ'],
    'Reservations': ['RESB', 'RESN', 'RESO', 'RESP', 'RESQ', 'RESR', 'RESS', 'REST', 'RESU', 'RESV', 'RESW', 'RESX', 'RESY', 'RESZ']
  },
  'HR - Human Resources': {
    'Personnel': ['PA0001', 'PA0002', 'PA0003', 'PA0008', 'PA0009', 'PA0014', 'PA0015', 'PA0016', 'PA0017', 'PA0018', 'PA0019', 'PA0020', 'PA0021', 'PA0022', 'PA0023', 'PA0024', 'PA0025', 'PA0026', 'PA0027', 'PA0028', 'PA0029', 'PA0030', 'PA0031', 'PA0032', 'PA0033', 'PA0034', 'PA0035', 'PA0036', 'PA0037', 'PA0038', 'PA0039', 'PA0040', 'PA0041', 'PA0042', 'PA0043', 'PA0044', 'PA0045', 'PA0046', 'PA0047', 'PA0048', 'PA0049', 'PA0050', 'PA0051', 'PA0052', 'PA0053', 'PA0054', 'PA0055', 'PA0056', 'PA0057', 'PA0058', 'PA0059', 'PA0060', 'PA0061', 'PA0062', 'PA0063', 'PA0064', 'PA0065', 'PA0066', 'PA0067', 'PA0068', 'PA0069', 'PA0070', 'PA0071', 'PA0072', 'PA0073', 'PA0074', 'PA0075', 'PA0076', 'PA0077', 'PA0078', 'PA0079', 'PA0080', 'PA0081', 'PA0082', 'PA0083', 'PA0084', 'PA0085', 'PA0086', 'PA0087', 'PA0088', 'PA0089', 'PA0090', 'PA0091', 'PA0092', 'PA0093', 'PA0094', 'PA0095', 'PA0096', 'PA0097', 'PA0098', 'PA0099', 'PA0100', 'PA0101', 'PA0102', 'PA0103', 'PA0104', 'PA0105', 'PA0106', 'PA0107', 'PA0108', 'PA0109', 'PA0110', 'PA0111', 'PA0112', 'PA0113', 'PA0114', 'PA0115', 'PA0116', 'PA0117', 'PA0118', 'PA0119', 'PA0120', 'PA0121', 'PA0122', 'PA0123', 'PA0124', 'PA0125', 'PA0126', 'PA0127', 'PA0128', 'PA0129', 'PA0130', 'PA0131', 'PA0132', 'PA0133', 'PA0134', 'PA0135', 'PA0136', 'PA0137', 'PA0138', 'PA0139', 'PA0140', 'PA0141', 'PA0142', 'PA0143', 'PA0144', 'PA0145', 'PA0146', 'PA0147', 'PA0148', 'PA0149', 'PA0150', 'PA0151', 'PA0152', 'PA0153', 'PA0154', 'PA0155', 'PA0156', 'PA0157', 'PA0158', 'PA0159', 'PA0160', 'PA0161', 'PA0162', 'PA0163', 'PA0164', 'PA0165', 'PA0166', 'PA0167', 'PA0168', 'PA0169', 'PA0170', 'PA0171', 'PA0172', 'PA0173', 'PA0174', 'PA0175', 'PA0176', 'PA0177', 'PA0178', 'PA0179', 'PA0180', 'PA0181', 'PA0182', 'PA0183', 'PA0184', 'PA0185', 'PA0186', 'PA0187', 'PA0188', 'PA0189', 'PA0190', 'PA0191', 'PA0192', 'PA0193', 'PA0194', 'PA0195', 'PA0196', 'PA0197', 'PA0198', 'PA0199', 'PA0200']
  }
};

// Flatten SAP tables for comparison
function flattenSapTables() {
  const flatList = [];
  for (const [module, categories] of Object.entries(sapTables)) {
    for (const [category, tables] of Object.entries(categories)) {
      for (const table of tables) {
        flatList.push({
          sapTable: table,
          module: module,
          category: category,
          isPattern: table.includes('*') || table.includes('?')
        });
      }
    }
  }
  return flatList;
}

// Get your database tables
async function getDatabaseTables() {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(r => r.table_name.toLowerCase());
}

// Find matching tables
function findMatches(sapTable, dbTables) {
  const matches = [];
  const sapLower = sapTable.toLowerCase();
  
  // Direct match
  if (dbTables.includes(sapLower)) {
    matches.push({ type: 'direct', table: sapLower });
    return matches;
  }
  
  // Pattern matching for common SAP tables
  const patterns = {
    'bkpf': ['accounting_document', 'document_header', 'gl_document'],
    'bseg': ['accounting_document_item', 'document_line', 'gl_entry'],
    'faglflex': ['general_ledger', 'gl_account'],
    'bsik': ['accounts_payable', 'ap_'],
    'bsid': ['accounts_receivable', 'ar_'],
    'lfa1': ['vendor', 'supplier'],
    'kna1': ['customer', 'erp_customer', 'sales_customer'],
    'mara': ['material', 'product'],
    'vbak': ['sales_order'],
    'vbap': ['sales_order_item'],
    'vbrk': ['sales_invoice', 'billing'],
    'vbrp': ['sales_invoice_item', 'billing_item'],
    'likp': ['delivery', 'shipment'],
    'lips': ['delivery_item', 'shipment_item'],
    'ekko': ['purchase_order'],
    'ekpo': ['purchase_order_item'],
    'mseg': ['goods_receipt', 'material_document'],
    'mkpf': ['goods_receipt', 'material_document'],
    'csks': ['cost_center'],
    'cepc': ['profit_center'],
    'anla': ['asset'],
    'afko': ['production_order'],
    'afvc': ['routing'],
    'crhd': ['work_center'],
    'mast': ['bill_of_material', 'bom'],
    'pa0001': ['employee', 'personnel']
  };
  
  for (const [sapKey, dbPatterns] of Object.entries(patterns)) {
    if (sapLower.includes(sapKey)) {
      for (const pattern of dbPatterns) {
        const found = dbTables.find(t => t.includes(pattern));
        if (found) {
          matches.push({ type: 'pattern', table: found, pattern: pattern });
        }
      }
    }
  }
  
  return matches;
}

async function compareWithSAP() {
  try {
    const dbTables = await getDatabaseTables();
    const sapTablesFlat = flattenSapTables();
    
    const comparison = {
      matched: [],
      missing: [],
      notNeeded: []
    };
    
    // Analyze each SAP table
    for (const sapEntry of sapTablesFlat) {
      if (sapEntry.isPattern) {
        // Skip pattern tables for now
        continue;
      }
      
      const matches = findMatches(sapEntry.sapTable, dbTables);
      
      if (matches.length > 0) {
        comparison.matched.push({
          sapTable: sapEntry.sapTable,
          module: sapEntry.module,
          category: sapEntry.category,
          yourTables: matches.map(m => m.table),
          matchType: matches[0].type
        });
      } else {
        // Determine if table is needed
        const reason = getMissingTableReason(sapEntry);
        comparison.missing.push({
          sapTable: sapEntry.sapTable,
          module: sapEntry.module,
          category: sapEntry.category,
          reason: reason.reason,
          priority: reason.priority,
          recommendation: reason.recommendation
        });
      }
    }
    
    // Create Excel export
    const excelData = [];
    
    // Sheet 1: Missing Tables Analysis
    excelData.push(['SAP Table', 'Module', 'Category', 'Priority', 'Reason', 'Recommendation']);
    
    // Sort by priority
    const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3, 'Not Needed': 4 };
    comparison.missing.sort((a, b) => {
      return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
    });
    
    for (const missing of comparison.missing) {
      excelData.push([
        missing.sapTable,
        missing.module,
        missing.category,
        missing.priority,
        missing.reason,
        missing.recommendation
      ]);
    }
    
    // Sheet 2: Matched Tables
    const matchedData = [['SAP Table', 'Module', 'Category', 'Your Table(s)', 'Match Type']];
    for (const matched of comparison.matched) {
      matchedData.push([
        matched.sapTable,
        matched.module,
        matched.category,
        matched.yourTables.join(', '),
        matched.matchType
      ]);
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Missing tables sheet
    const ws1 = XLSX.utils.aoa_to_sheet(excelData);
    ws1['!cols'] = [
      { wch: 20 }, // SAP Table
      { wch: 30 }, // Module
      { wch: 25 }, // Category
      { wch: 12 }, // Priority
      { wch: 60 }, // Reason
      { wch: 80 }  // Recommendation
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Missing SAP Tables');
    
    // Matched tables sheet
    const ws2 = XLSX.utils.aoa_to_sheet(matchedData);
    ws2['!cols'] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 25 },
      { wch: 40 },
      { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Matched Tables');
    
    // Summary sheet
    const summaryData = [
      ['Analysis Summary'],
      [''],
      ['Total SAP Tables Analyzed', sapTablesFlat.filter(t => !t.isPattern).length],
      ['Matched Tables', comparison.matched.length],
      ['Missing Tables', comparison.missing.length],
      [''],
      ['Missing by Priority'],
      ['High Priority', comparison.missing.filter(m => m.priority === 'High').length],
      ['Medium Priority', comparison.missing.filter(m => m.priority === 'Medium').length],
      ['Low Priority', comparison.missing.filter(m => m.priority === 'Low').length],
      ['Not Needed', comparison.missing.filter(m => m.priority === 'Not Needed').length]
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
    ws3['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Summary');
    
    // Write file
    const fileName = 'sap-tables-comparison-analysis.xlsx';
    XLSX.writeFile(wb, fileName);
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`📊 Total SAP Tables Analyzed: ${sapTablesFlat.filter(t => !t.isPattern).length}`);
    console.log(`✅ Matched: ${comparison.matched.length}`);
    console.log(`❌ Missing: ${comparison.missing.length}`);
    console.log(`\n📁 Excel file created: ${fileName}`);
    console.log(`\nHigh Priority Missing Tables: ${comparison.missing.filter(m => m.priority === 'High').length}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function getMissingTableReason(sapEntry) {
  const table = sapEntry.sapTable.toLowerCase();
  const module = sapEntry.module;
  
  // High priority - Core functionality tables
  const highPriority = [
    'bkpf', 'bseg', 'faglflex', 'bsik', 'bsak', 'bsid', 'bsad',
    'lfa1', 'kna1', 'mara', 'vbak', 'vbap', 'vbrk', 'vbrp',
    'ekko', 'ekpo', 'mseg', 'mkpf', 'csks', 'cepc', 'anla'
  ];
  
  // Medium priority - Important but can be consolidated
  const mediumPriority = [
    'marc', 'mard', 'makt', 'mbew', 'lfb1', 'knb1', 'vbkd', 'vbpa',
    'likp', 'lips', 'ekbe', 'eket', 'afko', 'afpo', 'afvc', 'crhd'
  ];
  
  // Low priority - Supporting tables
  const lowPriority = [
    't001', 't004', 't009', 'tvko', 'tvtw', 'tvta', 'tvst', 'tvak'
  ];
  
  // Not needed - SAP-specific or replaced
  const notNeeded = [
    'glpct', 'glpcp', 'glpco', // Special Purpose Ledger (replaced by modern GL)
    'a001', 'a002', 'a003' // Condition tables (handled differently)
  ];
  
  if (highPriority.some(p => table.includes(p))) {
    return {
      priority: 'High',
      reason: 'Core business functionality table - essential for operations',
      recommendation: 'Consider implementing if functionality is needed. May be consolidated with existing tables.'
    };
  }
  
  if (mediumPriority.some(p => table.includes(p))) {
    return {
      priority: 'Medium',
      reason: 'Important supporting table - enhances functionality',
      recommendation: 'Evaluate if specific SAP features are required. May be handled by existing tables.'
    };
  }
  
  if (lowPriority.some(p => table.includes(p))) {
    return {
      priority: 'Low',
      reason: 'Configuration/master data table - may be handled differently',
      recommendation: 'Review if SAP-specific configuration is needed. Often replaced by simpler structures.'
    };
  }
  
  if (notNeeded.some(p => table.includes(p))) {
    return {
      priority: 'Not Needed',
      reason: 'SAP-specific table or replaced by modern alternatives',
      recommendation: 'Not required - functionality handled by other means'
    };
  }
  
  // Default based on module
  if (module.includes('FI') || module.includes('CO')) {
    return {
      priority: 'Medium',
      reason: 'Financial/Controlling table - evaluate based on requirements',
      recommendation: 'Review business requirements to determine if needed'
    };
  }
  
  return {
    priority: 'Low',
    reason: 'Supporting table - may not be essential',
    recommendation: 'Evaluate based on specific business needs'
  };
}

compareWithSAP();

