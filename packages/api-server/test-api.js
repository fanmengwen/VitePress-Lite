#!/usr/bin/env node

// 简单的 API 测试脚本，用于验证后端功能
const server = 'http://localhost:3001';

console.log('🧪 开始 API 测试...\n');

// 测试健康检查
async function testHealth() {
  try {
    const response = await fetch(`${server}/health`);
    const data = await response.json();
    console.log('✅ 健康检查通过:', data);
    return true;
  } catch (error) {
    console.log('❌ 健康检查失败:', error.message);
    return false;
  }
}

// 测试用户注册
async function testRegister() {
  try {
    const response = await fetch(`${server}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        name: '测试用户',
        password: '123456'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 用户注册成功:', { 
        user: data.data.user.email,
        hasToken: !!data.data.token 
      });
      return data.data.token;
    } else {
      console.log('⚠️ 用户注册响应:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ 用户注册失败:', error.message);
    return null;
  }
}

// 测试用户登录
async function testLogin() {
  try {
    const response = await fetch(`${server}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123456'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 用户登录成功:', { 
        user: data.data.user.email,
        hasToken: !!data.data.token 
      });
      return data.data.token;
    } else {
      console.log('❌ 用户登录失败:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ 用户登录失败:', error.message);
    return null;
  }
}

// 测试获取文章列表
async function testGetPosts() {
  try {
    const response = await fetch(`${server}/api/posts`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 获取文章列表成功:', { 
        count: data.data.posts.length,
        posts: data.data.posts.map(p => p.title)
      });
      return true;
    } else {
      console.log('❌ 获取文章列表失败:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ 获取文章列表失败:', error.message);
    return false;
  }
}

// 测试创建文章
async function testCreatePost(token) {
  try {
    const response = await fetch(`${server}/api/posts`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: '测试文章',
        content: '这是一篇测试文章的内容',
        excerpt: '测试摘要',
        published: true
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 创建文章成功:', { 
        title: data.data.post.title,
        slug: data.data.post.slug,
        published: data.data.post.published
      });
      return data.data.post.slug;
    } else {
      console.log('❌ 创建文章失败:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ 创建文章失败:', error.message);
    return null;
  }
}

// 测试获取文章详情
async function testGetPostBySlug(slug) {
  try {
    const response = await fetch(`${server}/api/posts/${slug}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 获取文章详情成功:', { 
        title: data.data.post.title,
        author: data.data.post.author.name
      });
      return true;
    } else {
      console.log('❌ 获取文章详情失败:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ 获取文章详情失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('📡 等待服务器启动...');
  
  // 等待服务器启动
  let retries = 10;
  let healthy = false;
  
  while (retries > 0 && !healthy) {
    healthy = await testHealth();
    if (!healthy) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries--;
    }
  }
  
  if (!healthy) {
    console.log('❌ 无法连接到服务器，请确保服务器已启动');
    process.exit(1);
  }
  
  console.log('\n📝 开始功能测试...\n');
  
  // 测试注册/登录
  let token = await testRegister();
  if (!token) {
    token = await testLogin();
  }
  
  if (!token) {
    console.log('❌ 无法获取认证令牌');
    return;
  }
  
  // 测试文章功能
  await testGetPosts();
  const slug = await testCreatePost(token);
  if (slug) {
    await testGetPostBySlug(slug);
  }
  
  console.log('\n🎉 API 测试完成！');
}

// 运行测试
runTests().catch(console.error);