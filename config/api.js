module.exports = ({ env }) => ({
  rest: {
    defaultLimit: env.int('API_DEFAULT_LIMIT', 25),
    maxLimit: env.int('API_MAX_LIMIT', 100),
    withCount: env.bool('API_WITH_COUNT', true),
  },
});
