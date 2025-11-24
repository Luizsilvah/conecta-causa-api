// ============================================
// CONECTA CAUSA - API REST COMPLETA
// Plataforma de Conexão Voluntária Local
// Autor: [Seu Nome]
// ============================================

// Importação dos pacotes necessários
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Inicialização do aplicativo Express
const app = express();
// Middleware para permitir que o Express entenda requisições com corpo em formato JSON
app.use(express.json());

// ============================================
// CONFIGURAÇÕES
// ============================================
const PORT = 3000; // Porta onde o servidor será executado
const JWT_SECRET = 'seu_secret_key_aqui_mude_em_producao'; // Chave secreta para assinar os tokens JWT. Deve ser guardada de forma segura.
const SALT_ROUNDS = 10; // Fator de custo para o algoritmo de hash do bcrypt. Define a complexidade da criptografia da senha.

// ============================================
// BANCO DE DADOS EM MEMÓRIA (Simulado)
// ============================================
// Para fins de prototipagem, usamos objetos JavaScript para simular um banco de dados.
// Em um ambiente de produção, isso seria substituído por um banco de dados real (ex: PostgreSQL, MongoDB).
const db = {
  users: [], // Armazena todos os usuários (voluntários e organizações)
  volunteers: [],
  organizations: [],
  opportunities: [],
  applications: []
};

let currentId = {
  // Contador para gerar IDs únicos para cada nova entidade, simulando o auto-incremento de um banco de dados.
  user: 1,
  volunteer: 1,
  organization: 1,
  opportunity: 1,
  application: 1
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Calcula a distância em quilômetros entre duas coordenadas geográficas usando a fórmula de Haversine.
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calcula um "score de compatibilidade" entre um voluntário e uma oportunidade.
function calculateMatchScore(volunteer, opportunity) {
  // 1. Compatibilidade de habilidades (40%)
  const volunteerSkills = volunteer.skills || [];
  const requiredSkills = opportunity.required_skills || [];
  
  const commonSkills = volunteerSkills.filter(skill => 
    requiredSkills.includes(skill)
  );
  
  const skillCompatibility = requiredSkills.length > 0
    ? (commonSkills.length / requiredSkills.length) * 100
    : 0;

  // 2. Score de distância (30%): quanto mais perto, maior a pontuação.
  const distance = calculateDistance(
    volunteer.latitude,
    volunteer.longitude,
    opportunity.latitude,
    opportunity.longitude
  );
  const distanceScore = Math.max(0, 100 - (distance * 5)); // A cada 1km, perde 5 pontos.

  // 3. Score de disponibilidade (30%) - Simplificado
  const availabilityScore = 100; // Assumindo sempre disponível

  // Score final ponderado
  const finalScore = 
    (skillCompatibility * 0.4) +
    (distanceScore * 0.3) +
    (availabilityScore * 0.3);

  return {
    score: Math.round(finalScore),
    skill_compatibility: Math.round(skillCompatibility),
    distance_km: Math.round(distance * 10) / 10,
    common_skills: commonSkills
  };
}

// Função genérica para atualizar os campos de uma entidade (ex: organização) com os dados recebidos no corpo da requisição.
function updateEntity(entity, data) {
  const fields = Object.keys(entity);
  for (const key in data) {
    if (fields.includes(key)) {
      entity[key] = data[key] || entity[key];
    }
  }
  // Permite adicionar campos que não existem na entidade original, como 'website' para organizações.
  if (data.website) {
    entity.website = data.website;
  }
}

// ============================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ============================================
// Middleware é uma função que intercepta a requisição antes de chegar na rota final.

// Verifica se a requisição contém um token JWT válido no cabeçalho 'Authorization'.
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato esperado: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // Verifica a validade e a assinatura do token.
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    // Se o token for válido, anexa os dados do usuário (payload do token) ao objeto `req`.
    req.user = user;
    next(); // Passa a requisição para o próximo middleware ou para a rota.
  });
}

// Middleware de Autorização que verifica se o tipo de usuário logado corresponde ao tipo necessário para acessar a rota.
function authorize(userType) {
  return (req, res, next) => {
    if (req.user.user_type !== userType) {
      return res.status(403).json({
        error: `Acesso restrito. Apenas para usuários do tipo '${userType}'.`
      });
    }
    next();
  };
}

// Função "wrapper" para rotas assíncronas. Ela garante que qualquer erro que ocorra
// dentro de uma função `async` seja capturado e passado para o middleware de tratamento de erros.
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};


// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

// Rota para registrar um novo usuário (voluntário ou organização).
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { name, email, password, user_type, profile } = req.body;

  // Validações
  if (!name || !email || !password || !user_type) {
    return res.status(400).json({ 
      error: 'Campos obrigatórios: name, email, password, user_type' 
    });
  }

  if (!['volunteer', 'organization'].includes(user_type)) {
    return res.status(400).json({ 
      error: 'user_type deve ser "volunteer" ou "organization"' 
    });
  }

  // Verifica se email já existe
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }

  // Criptografa a senha antes de salvar
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: currentId.user++,
    name,
    email,
    password_hash: passwordHash,
    user_type,
    created_at: new Date().toISOString()
  };
  db.users.push(user);

  // Cria o perfil correspondente (voluntário ou organização) e o associa ao usuário recém-criado.
  if (user_type === 'volunteer') {
    const volunteer = {
      id: currentId.volunteer++,
      user_id: user.id,
      skills: profile?.skills || [],
      latitude: profile?.latitude || 0,
      longitude: profile?.longitude || 0,
      bio: profile?.bio || '',
      phone: profile?.phone || ''
    };
    db.volunteers.push(volunteer);
  } else {
    const organization = {
      id: currentId.organization++,
      user_id: user.id,
      organization_name: profile?.organization_name || name,
      description: profile?.description || '',
      cnpj: profile?.cnpj || '',
      address: profile?.address || '',
      latitude: profile?.latitude || 0,
      longitude: profile?.longitude || 0,
      phone: profile?.phone || ''
    };
    db.organizations.push(organization);
  }

  // Remove o hash da senha do objeto de usuário antes de enviá-lo na resposta por segurança.
  const { password_hash, ...userResponse } = user;

  res.status(201).json({
    message: 'Usuário registrado com sucesso',
    user: userResponse
  });
}));

// Rota para autenticar um usuário e retornar um token JWT.
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Email e senha são obrigatórios' 
    });
  }

  // Busca o usuário pelo email.
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Compara a senha fornecida com o hash armazenado no banco de dados.
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Se as credenciais estiverem corretas, gera um novo token JWT.
  const token = jwt.sign(
    { id: user.id, email: user.email, user_type: user.user_type },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const { password_hash, ...userResponse } = user;

  res.json({
    token,
    user: userResponse
  });
}));

// Rota para obter os dados do usuário atualmente autenticado (com base no token).
app.get('/api/users/me', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  let profile = null;
  if (user.user_type === 'volunteer') {
    profile = db.volunteers.find(v => v.user_id === user.id);
  } else {
    profile = db.organizations.find(o => o.user_id === user.id);
  }

  const { password_hash, ...userResponse } = user;

  res.json({
    ...userResponse,
    profile
  });
});

// ============================================
// ROTAS DE ORGANIZAÇÕES
// ============================================

// Rota para uma organização atualizar seu próprio perfil.
// A criação inicial do perfil ocorre durante o registro do usuário.
app.post('/api/organizations', authenticateToken, authorize('organization'), (req, res) => {
  const organization = db.organizations.find(o => o.user_id === req.user.id);
  if (!organization) {
    return res.status(404).json({ error: 'Organização não encontrada' });
  }

  // Atualiza dados
  // A rota POST aqui está funcionando como um PUT/PATCH para o perfil da organização
  // que foi criado durante o registro.
  updateEntity(organization, req.body);

  res.json({
    message: 'Organização atualizada com sucesso',
    organization
  });
});

// Rota para buscar os detalhes públicos de uma organização específica pelo seu ID.
app.get('/api/organizations/:id', (req, res) => {
  const organization = db.organizations.find(o => o.id === parseInt(req.params.id));
  if (!organization) {
    return res.status(404).json({ error: 'Organização não encontrada' });
  }

  const user = db.users.find(u => u.id === organization.user_id);
  const opportunities = db.opportunities.filter(
    op => op.organization_id === organization.id
  );

  res.json({
    ...organization,
    user_name: user?.name,
    opportunities_count: opportunities.length
  });
});

// Rota para uma organização atualizar seu próprio perfil, verificando a propriedade.
app.put('/api/organizations/:id', authenticateToken, authorize('organization'), (req, res) => {
  const organization = db.organizations.find(o => o.id === parseInt(req.params.id));
  
  if (!organization) {
    return res.status(404).json({ error: 'Organização não encontrada' });
  }

  if (organization.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Sem permissão para editar' });
  }

  updateEntity(organization, req.body);

  res.json({
    message: 'Organização atualizada com sucesso',
    organization
  });
});

// ============================================
// ROTAS DE OPORTUNIDADES
// ============================================

// Rota para uma organização criar uma nova oportunidade de voluntariado.
app.post('/api/opportunities', authenticateToken, authorize('organization'), (req, res) => {
  const organization = db.organizations.find(o => o.user_id === req.user.id);
  if (!organization) {
    return res.status(404).json({ error: 'Organização não encontrada' });
  }

  const { title, description, required_skills, location, latitude, longitude, schedule, vacancies } = req.body;

  if (!title || !description) {
    return res.status(400).json({ 
      error: 'Título e descrição são obrigatórios' 
    });
  }

  const opportunity = {
    id: currentId.opportunity++,
    organization_id: organization.id,
    title,
    description,
    required_skills: required_skills || [],
    location: location || '',
    latitude: latitude || organization.latitude,
    longitude: longitude || organization.longitude,
    schedule: schedule || {},
    vacancies: vacancies || 1,
    status: 'active',
    created_at: new Date().toISOString()
  };

  db.opportunities.push(opportunity);

  res.status(201).json({
    message: 'Oportunidade criada com sucesso',
    opportunity
  });
});

// Rota para listar todas as oportunidades ativas, com suporte a filtros e paginação.
app.get('/api/opportunities', (req, res) => {
  let opportunities = db.opportunities.filter(op => op.status === 'active');

  // Filtro por habilidades
  if (req.query.skills) {
    const skills = req.query.skills.split(',');
    opportunities = opportunities.filter(op => 
      op.required_skills.some(skill => skills.includes(skill))
    );
  }

  // Filtro por localização (latitude, longitude e raio em km).
  if (req.query.latitude && req.query.longitude) {
    const lat = parseFloat(req.query.latitude);
    const lon = parseFloat(req.query.longitude);
    const radius = parseFloat(req.query.radius) || 10;

    opportunities = opportunities.filter(op => {
      const distance = calculateDistance(lat, lon, op.latitude, op.longitude);
      return distance <= radius;
    }).map(op => ({
      ...op,
      distance_km: Math.round(calculateDistance(lat, lon, op.latitude, op.longitude) * 10) / 10
    }));
  }

  // Adiciona o nome da organização a cada oportunidade para facilitar a exibição no frontend.
  const enrichedOpportunities = opportunities.map(op => {
    const org = db.organizations.find(o => o.id === op.organization_id);
    return {
      ...op,
      organization_name: org?.organization_name || 'Desconhecida'
    };
  });

  // Lógica de paginação para não retornar todos os resultados de uma vez.
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedOpportunities = enrichedOpportunities.slice(startIndex, endIndex);

  res.json({
    opportunities: paginatedOpportunities,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(enrichedOpportunities.length / limit),
      total_items: enrichedOpportunities.length
    }
  });
});

// Rota de "matchmaking" inteligente: retorna uma lista de oportunidades ordenadas por relevância
// para o voluntário autenticado, com base em habilidades e distância.
app.get('/api/opportunities/match', authenticateToken, authorize('volunteer'), (req, res) => {
  const volunteer = db.volunteers.find(v => v.user_id === req.user.id);
  if (!volunteer) {
    return res.status(404).json({ error: 'Perfil de voluntário não encontrado' });
  }

  const opportunities = db.opportunities.filter(op => op.status === 'active');

  // Calcula o score de compatibilidade para cada oportunidade em relação ao voluntário.
  const matches = opportunities.map(op => {
    const matchDetails = calculateMatchScore(volunteer, op);
    const org = db.organizations.find(o => o.id === op.organization_id);

    return {
      id: op.id,
      title: op.title,
      description: op.description,
      match_score: matchDetails.score,
      match_details: {
        skill_compatibility: matchDetails.skill_compatibility,
        distance_km: matchDetails.distance_km,
        common_skills: matchDetails.common_skills
      },
      organization: org?.organization_name || 'Desconhecida',
      location: op.location,
      vacancies: op.vacancies
    };
  });

  // Ordena as oportunidades pelo score, da mais relevante para a menos relevante.
  matches.sort((a, b) => b.match_score - a.match_score);

  // Filtra para retornar apenas os "bons" matches, com score acima de um certo limite.
  const goodMatches = matches.filter(m => m.match_score > 30);

  res.json({
    matches: goodMatches,
    total_matches: goodMatches.length
  });
});

// ============================================
// ROTAS DE CANDIDATURAS
// ============================================

// Rota para um voluntário se candidatar a uma oportunidade específica.
app.post('/api/opportunities/:id/apply', authenticateToken, authorize('volunteer'), (req, res) => {
  const opportunity = db.opportunities.find(
    op => op.id === parseInt(req.params.id)
  );

  if (!opportunity) {
    return res.status(404).json({ error: 'Oportunidade não encontrada' });
  }

  if (opportunity.status !== 'active') {
    return res.status(400).json({ error: 'Oportunidade não está ativa' });
  }

  const volunteer = db.volunteers.find(v => v.user_id === req.user.id);
  if (!volunteer) {
    return res.status(404).json({ error: 'Perfil de voluntário não encontrado' });
  }

  // Verifica se já se candidatou
  const existingApplication = db.applications.find(
    app => app.opportunity_id === opportunity.id && app.volunteer_id === volunteer.id
  );

  if (existingApplication) {
    return res.status(400).json({ error: 'Você já se candidatou a esta oportunidade' });
  }

  const application = {
    id: currentId.application++,
    opportunity_id: opportunity.id,
    volunteer_id: volunteer.id,
    status: 'pending',
    message: req.body.message || '',
    applied_at: new Date().toISOString()
  };

  db.applications.push(application);

  res.status(201).json({
    message: 'Candidatura enviada com sucesso',
    application
  });
});

// Rota para um voluntário visualizar todas as suas candidaturas.
app.get('/api/users/my-applications', authenticateToken, authorize('volunteer'), (req, res) => {
  const volunteer = db.volunteers.find(v => v.user_id === req.user.id);
  if (!volunteer) {
    return res.status(404).json({ error: 'Perfil de voluntário não encontrado' });
  }

  const applications = db.applications.filter(
    app => app.volunteer_id === volunteer.id
  );

  // Enriquece os dados da candidatura com informações da oportunidade e da organização.
  const enrichedApplications = applications.map(app => {
    const opportunity = db.opportunities.find(op => op.id === app.opportunity_id);
    const organization = db.organizations.find(
      org => org.id === opportunity?.organization_id
    );

    return {
      id: app.id,
      opportunity: {
        id: opportunity?.id,
        title: opportunity?.title,
        organization: organization?.organization_name
      },
      status: app.status,
      message: app.message,
      applied_at: app.applied_at
    };
  });

  res.json({
    applications: enrichedApplications,
    total: enrichedApplications.length
  });
});

// ============================================
// ROTA RAIZ
// ============================================
// A rota raiz (/) serve como uma página de documentação simples, listando os endpoints disponíveis.
app.get('/', (req, res) => {
  res.json({
    message: 'Conecta Causa API - v1.0',
    endpoints: {
      auth: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/users/me'
      ],
      organizations: [
        'POST /api/organizations',
        'GET /api/organizations/:id',
        'PUT /api/organizations/:id'
      ],
      opportunities: [
        'POST /api/opportunities',
        'GET /api/opportunities',
        'GET /api/opportunities/match'
      ],
      applications: [
        'POST /api/opportunities/:id/apply',
        'GET /api/users/my-applications'
      ]
    },
    documentation: 'https://github.com/seu-usuario/conecta-causa'
  });
});

// ============================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ============================================
// Este é um middleware especial do Express que captura erros.
// Ele deve ser o último `app.use()` a ser adicionado.
app.use((err, req, res, next) => {
  console.error(err.stack); // Log do erro para depuração
  res.status(500).json({ 
    error: 'Ocorreu um erro inesperado no servidor.',
    message: err.message // Opcional: pode ser útil em desenvolvimento
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
// Inicia o servidor para escutar requisições na porta configurada.
app.listen(PORT, () => {
  console.log(`🚀 Conecta Causa API rodando na porta ${PORT}`);
  console.log(`📍 Acesse: http://localhost:${PORT}`);
  console.log(`📚 Documentação: http://localhost:${PORT}/`);
});