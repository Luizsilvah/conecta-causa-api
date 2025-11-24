# 🤝 Conecta Causa - API REST

API de matchmaking e gestão para voluntariado local. Conecta voluntários com organizações sociais de forma inteligente.

---

## 📋 Problema Social

A dificuldade na conexão entre organizações sociais que necessitam de voluntários e pessoas dispostas a ajudar. A falta de uma plataforma centralizada causa:
- Baixo engajamento voluntário
- Vagas de voluntariado não preenchidas
- Voluntários desmotivados por não encontrar oportunidades adequadas

---

## 🎯 Solução

API RESTful que realiza o **matchmaking inteligente** entre voluntários e oportunidades com base em:
- **Habilidades** do voluntário vs. requisitos da vaga
- **Localização geográfica** (proximidade)
- **Disponibilidade** de horários

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 16+ instalado
- NPM ou Yarn

### Passos

1. **Clone ou crie a pasta do projeto:**
```bash
mkdir conecta-causa-api
cd conecta-causa-api
```

2. **Crie o arquivo `server.js`** com o código da API

3. **Crie o arquivo `package.json`** com as dependências

4. **Instale as dependências:**
```bash
npm install
```

5. **Execute o servidor:**
```bash
npm start
```

Ou para desenvolvimento (com auto-reload):
```bash
npm run dev
```

A API estará rodando em: **http://localhost:3000**

---

## 📚 Endpoints da API

### 🔐 Autenticação

#### 1. Registrar Usuário
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "user_type": "volunteer",
  "profile": {
    "skills": ["educação", "informática"],
    "latitude": -23.550520,
    "longitude": -46.633308,
    "bio": "Professor aposentado",
    "phone": "(11) 98765-4321"
  }
}
```

**Resposta (201):**
```json
{
  "message": "Usuário registrado com sucesso",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "user_type": "volunteer"
  }
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Resposta (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "user_type": "volunteer"
  }
}
```

#### 3. Meu Perfil
```http
GET /api/users/me
Authorization: Bearer {seu_token}
```

---

### 🏢 Organizações

#### 4. Atualizar Organização
```http
POST /api/organizations
Authorization: Bearer {token_da_organizacao}
Content-Type: application/json

{
  "organization_name": "ONG Educação para Todos",
  "description": "Promovemos educação em comunidades",
  "cnpj": "12.345.678/0001-90",
  "address": "Rua das Flores, 123",
  "latitude": -23.550520,
  "longitude": -46.633308,
  "phone": "(11) 3333-4444"
}
```

#### 5. Ver Organização
```http
GET /api/organizations/1
```

#### 6. Editar Organização
```http
PUT /api/organizations/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Nova descrição",
  "phone": "(11) 99999-8888"
}
```

---

### 💼 Oportunidades

#### 7. Criar Oportunidade
```http
POST /api/opportunities
Authorization: Bearer {token_da_organizacao}
Content-Type: application/json

{
  "title": "Aulas de Reforço Escolar",
  "description": "Buscamos voluntários para dar aulas de matemática",
  "required_skills": ["educação", "matemática"],
  "location": "Centro Comunitário Vila Nova",
  "latitude": -23.548000,
  "longitude": -46.635000,
  "schedule": {
    "days": ["terça", "quinta"],
    "time": "14:00-16:00"
  },
  "vacancies": 3
}
```

#### 8. Listar Oportunidades
```http
GET /api/opportunities
```

**Com filtros:**
```http
GET /api/opportunities?skills=educação,informática&latitude=-23.55&longitude=-46.63&radius=5&page=1&limit=10
```

#### 9. Matchmaking Inteligente (⭐ Diferencial)
```http
GET /api/opportunities/match
Authorization: Bearer {token_do_voluntario}
```

**Resposta (200):**
```json
{
  "matches": [
    {
      "id": 1,
      "title": "Aulas de Reforço Escolar",
      "match_score": 95,
      "match_details": {
        "skill_compatibility": 100,
        "distance_km": 2.5,
        "common_skills": ["educação"]
      },
      "organization": "ONG Educação para Todos",
      "location": "Centro Comunitário Vila Nova",
      "vacancies": 3
    }
  ],
  "total_matches": 1
}
```

---

### 📝 Candidaturas

#### 10. Candidatar-se a Oportunidade
```http
POST /api/opportunities/1/apply
Authorization: Bearer {token_do_voluntario}
Content-Type: application/json

{
  "message": "Tenho 10 anos de experiência como professor"
}
```

#### 11. Minhas Candidaturas
```http
GET /api/users/my-applications
Authorization: Bearer {token_do_voluntario}
```

---

## 🧪 Testando a API

### Com cURL

**1. Registrar voluntário:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos",
    "email": "maria@email.com",
    "password": "senha123",
    "user_type": "volunteer",
    "profile": {
      "skills": ["saúde", "enfermagem"],
      "latitude": -23.550520,
      "longitude": -46.633308
    }
  }'
```

**2. Fazer login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@email.com",
    "password": "senha123"
  }'
```

**3. Ver perfil (use o token recebido):**
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Com Postman ou Insomnia

1. Importe os endpoints acima
2. Crie uma variável de ambiente para o token
3. Configure o Authorization como "Bearer Token"

---

## 🏗️ Arquitetura

```
conecta-causa-api/
│
├── server.js           # Código principal da API
├── package.json        # Dependências
├── README.md          # Este arquivo
└── .gitignore         # Arquivos ignorados pelo Git
```

### Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **bcrypt** - Criptografia de senhas
- **jsonwebtoken** - Autenticação JWT
- **Banco de Dados** - Em memória (simulado)

---

## 🧮 Algoritmo de Matchmaking

O algoritmo calcula um **score de 0 a 100** para cada oportunidade:

```
Score Final = (40% × Compatibilidade de Skills) + 
              (30% × Score de Distância) + 
              (30% × Score de Disponibilidade)
```

### Exemplo:
- **Voluntário:** habilidades [educação, informática], localização (-23.55, -46.63)
- **Oportunidade:** requer [educação], localização (-23.54, -46.63), 1km de distância

**Cálculo:**
- Compatibilidade: 100% (tem educação)
- Distância: 95 pontos (1km de distância)
- Disponibilidade: 100% (compatível)

**Score Final:** (0.4 × 100) + (0.3 × 95) + (0.3 × 100) = **98.5 pontos**

---

## 🔒 Segurança Implementada

✅ Senhas criptografadas com **bcrypt**  
✅ Autenticação via **JWT** (token expira em 24h)  
✅ Middleware de verificação de token  
✅ Validação de permissões por tipo de usuário  
✅ Proteção de rotas sensíveis  

---

## 📊 Funcionalidades Implementadas

### Obrigatórias ✅
- [x] Cadastro e login com JWT
- [x] CRUD de organizações
- [x] CRUD de oportunidades
- [x] Sistema de candidaturas
- [x] Listagem com filtros

### Diferenciais ⭐
- [x] Algoritmo de matchmaking inteligente
- [x] Cálculo de distância geográfica (Haversine)
- [x] Score de compatibilidade
- [x] Filtros avançados (skills, localização, raio)
- [x] Paginação de resultados

---

## 🚀 Melhorias Futuras

- [ ] Integrar banco de dados real (PostgreSQL/MongoDB)
- [ ] Adicionar validações com Joi/Yup
- [ ] Implementar refresh token
- [ ] Adicionar testes unitários e de integração
- [ ] Criar documentação Swagger
- [ ] Implementar rate limiting
- [ ] Sistema de notificações
- [ ] Upload de imagens
- [ ] Chat entre voluntário e organização

---

## 📝 Observações para Entrega

### Pontos Fortes do Projeto:

1. **Problema Social Relevante:** Aborda dificuldade real de engajamento cívico
2. **Arquitetura RESTful:** Endpoints bem estruturados e semânticos
3. **Segurança:** JWT, bcrypt, validações
4. **Algoritmo Inteligente:** Matchmaking baseado em múltiplos critérios
5. **Geolocalização:** Usa fórmula de Haversine para distâncias precisas
6. **Código Limpo:** Bem comentado e organizado

### Como Demonstrar:

1. Mostre o fluxo completo:
   - Registro de organização
   - Criação de oportunidade
   - Registro de voluntário
   - Matchmaking retornando a oportunidade com score alto

2. Destaque o diferencial:
   - O algoritmo de matchmaking é o ponto chave
   - Mostra a complexidade do back-end

---

## 👨‍💻 Autor

**[Seu Nome]**  
Projeto desenvolvido para a disciplina de Programação Web Back-End  
[Sua Instituição] - [Ano]

---

## 📄 Licença

Este projeto é de código aberto para fins educacionais.

---

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique se todas as dependências foram instaladas
2. Confirme que a porta 3000 está livre
3. Teste os endpoints na ordem sugerida

**Contato:** [seu-email@exemplo.com]