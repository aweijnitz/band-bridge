const request = require('supertest');
const { PrismaClient } = require('../../src/generated/prisma');
const bcrypt = require('bcrypt');

// We need to use the actual Next.js app
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

describe('Gallery Comments API', () => {
  let server;
  let testUser;
  let testProject;
  let testImage1;
  let testImage2;
  let sessionCookie;

  beforeAll(async () => {
    await app.prepare();
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
    
    // Create test user
    const passwordHash = await bcrypt.hash('testpass', 10);
    testUser = await prisma.user.create({
      data: {
        username: 'testuser_gallery',
        passwordHash,
      },
    });

    // Create test project
    testProject = await prisma.project.create({
      data: {
        name: 'Test Gallery Project',
        description: 'Test project for gallery comments',
        ownerId: testUser.id,
        status: 'open',
      },
    });

    // Create test images
    testImage1 = await prisma.media.create({
      data: {
        projectId: testProject.id,
        title: 'Test Image 1',
        description: 'First test image',
        filePath: 'test1.jpg',
        type: 'image',
      },
    });

    testImage2 = await prisma.media.create({
      data: {
        projectId: testProject.id,
        title: 'Test Image 2', 
        description: 'Second test image',
        filePath: 'test2.jpg',
        type: 'image',
      },
    });

    // Create session for authentication
    const session = await prisma.session.create({
      data: {
        sessionId: 'test-session-gallery',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
    });

    sessionCookie = `session=${session.sessionId}`;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.comment.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.media.deleteMany({
      where: { projectId: testProject.id },
    });
    await prisma.session.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.project.delete({
      where: { id: testProject.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
    if (server) {
      server.close();
    }
  });

  describe('GET /api/project/[id]/gallery/comment', () => {
    it('should return empty array when no gallery comments exist', async () => {
      const response = await request(server)
        .get(`/api/project/${testProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(server)
        .get(`/api/project/${testProject.id}/gallery/comment`);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(server)
        .get('/api/project/invalid/gallery/comment')
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });
  });

  describe('POST /api/project/[id]/gallery/comment', () => {
    it('should create a gallery comment successfully', async () => {
      const commentText = 'This is a test gallery comment';

      const response = await request(server)
        .post(`/api/project/${testProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie)
        .send({ text: commentText });

      expect(response.status).toBe(201);
      expect(response.body.text).toBe(commentText);
      expect(response.body.time).toBe(-1); // Special marker for gallery comments
      expect(response.body.mediaId).toBe(testImage1.id); // Should be linked to first image
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.createdAt).toBeDefined();
    });

    it('should return gallery comments after creation', async () => {
      const response = await request(server)
        .get(`/api/project/${testProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].text).toBe('This is a test gallery comment');
      expect(response.body[0].time).toBe(-1);
      expect(response.body[0].user.username).toBe(testUser.username);
    });

    it('should create multiple gallery comments', async () => {
      const commentText2 = 'Second gallery comment';

      const response = await request(server)
        .post(`/api/project/${testProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie)
        .send({ text: commentText2 });

      expect(response.status).toBe(201);

      // Check that we now have 2 comments
      const getResponse = await request(server)
        .get(`/api/project/${testProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.length).toBe(2);
      expect(getResponse.body[1].text).toBe(commentText2); // Second comment should be last
    });

    it('should return 401 without authentication', async () => {
      const response = await request(server)
        .post(`/api/project/${testProject.id}/gallery/comment`)
        .send({ text: 'Test comment' });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing comment text', async () => {
      const response = await request(server)
        .post(`/api/project/${testProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing or invalid comment text');
    });

    it('should return 400 for invalid comment text', async () => {
      const response = await request(server)
        .post(`/api/project/${testProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie)
        .send({ text: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing or invalid comment text');
    });

    it('should return 404 when no images exist in project', async () => {
      // Create a project with no images
      const emptyProject = await prisma.project.create({
        data: {
          name: 'Empty Project',
          ownerId: testUser.id,
          status: 'open',
        },
      });

      const response = await request(server)
        .post(`/api/project/${emptyProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie)
        .send({ text: 'Test comment' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No images found in this project');

      // Clean up
      await prisma.project.delete({
        where: { id: emptyProject.id },
      });
    });

    it('should return 400 for invalid project ID', async () => {
      const response = await request(server)
        .post('/api/project/invalid/gallery/comment')
        .set('Cookie', sessionCookie)
        .send({ text: 'Test comment' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });
  });

  describe('Gallery Comments vs Regular Media Comments', () => {
    it('should not mix gallery comments with regular media comments', async () => {
      // Add a regular media comment (without time: -1)
      const regularComment = await prisma.comment.create({
        data: {
          mediaId: testImage1.id,
          userId: testUser.id,
          text: 'This is a regular media comment',
          time: 10.5, // Regular timestamp
        },
        include: { user: { select: { username: true } } },
      });

      // Gallery comments should not include the regular comment
      const galleryResponse = await request(server)
        .get(`/api/project/${testProject.id}/gallery/comment`)
        .set('Cookie', sessionCookie);

      expect(galleryResponse.status).toBe(200);
      const galleryComments = galleryResponse.body;
      
      // Should still have our 2 gallery comments, not the regular one
      expect(galleryComments.length).toBe(2);
      expect(galleryComments.every(c => c.time === -1)).toBe(true);
      expect(galleryComments.some(c => c.text === 'This is a regular media comment')).toBe(false);

      // Clean up
      await prisma.comment.delete({
        where: { id: regularComment.id },
      });
    });
  });
});