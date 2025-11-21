import postgres from 'postgres';

// This script creates all tables directly using raw SQL
// Usage: Set DATABASE_URL environment variable and run: node create-tables-direct.mjs

console.log('🔧 Direct Table Creation Script');
console.log('================================\n');

// Get DATABASE_URL from Railway
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable is not set');
  console.error('');
  console.error('To get your DATABASE_URL from Railway:');
  console.error('1. Go to Railway → Postgres service');
  console.error('2. Click "Connect" tab');
  console.error('3. Copy the "Postgres Connection URL"');
  console.error('4. Run: DATABASE_URL="your-url-here" node create-tables-direct.mjs');
  process.exit(1);
}

console.log('✅ DATABASE_URL found');
console.log('📡 Connecting to database...\n');

const sql = postgres(DATABASE_URL, { max: 1 });

async function createTables() {
  try {
    console.log('🔧 Creating tables...\n');

    // Enable UUID extension
    console.log('  → Enabling pgcrypto extension...');
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
    console.log('  ✅ Extension enabled\n');

    // Create users table
    console.log('  → Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        display_name text,
        photo_url text,
        stripe_customer_id text,
        stripe_subscription_id text,
        subscription_plan text,
        subscription_status text,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log('  ✅ users table created');

    // Create projects table
    console.log('  → Creating projects table...');
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        name text NOT NULL,
        description text,
        size text NOT NULL,
        thumbnail_url text,
        language text DEFAULT 'en',
        brand_kit jsonb,
        is_public integer DEFAULT 0,
        public_visual_id varchar,
        category text,
        view_count integer DEFAULT 0,
        source text,
        original_project_id varchar,
        original_creator_name text,
        original_publish_date timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ projects table created');

    // Create campaigns table
    console.log('  → Creating campaigns table...');
    await sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        headline text NOT NULL,
        subheadline text NOT NULL,
        description text,
        hashtags jsonb DEFAULT '[]'::jsonb,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ campaigns table created');

    // Add foreign key for campaigns
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'campaigns_project_id_projects_id_fk'
        ) THEN
          ALTER TABLE campaigns ADD CONSTRAINT campaigns_project_id_projects_id_fk 
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `;

    // Create campaign_images table
    console.log('  → Creating campaign_images table...');
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_images (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id varchar NOT NULL,
        image_url text NOT NULL,
        rendered_image_url text,
        design_override jsonb,
        visual_analysis jsonb,
        edit_metadata jsonb,
        is_saved integer DEFAULT 0,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ campaign_images table created');

    // Add foreign key for campaign_images
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'campaign_images_campaign_id_campaigns_id_fk'
        ) THEN
          ALTER TABLE campaign_images ADD CONSTRAINT campaign_images_campaign_id_campaigns_id_fk 
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `;

    // Create visuals table
    console.log('  → Creating visuals table...');
    await sql`
      CREATE TABLE IF NOT EXISTS visuals (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        type text NOT NULL,
        prompt text,
        image_url text NOT NULL,
        product_image_url text,
        metadata jsonb,
        creator_id varchar,
        creator_name text,
        creator_email text,
        creator_photo text,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ visuals table created');

    // Create text_content table
    console.log('  → Creating text_content table...');
    await sql`
      CREATE TABLE IF NOT EXISTS text_content (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        type text NOT NULL,
        content text NOT NULL,
        metadata jsonb,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ text_content table created');

    // Create api_usage table
    console.log('  → Creating api_usage table...');
    await sql`
      CREATE TABLE IF NOT EXISTS api_usage (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        endpoint text NOT NULL,
        tokens_used integer,
        cost integer,
        timestamp timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ api_usage table created');

    // Create promo_videos table
    console.log('  → Creating promo_videos table...');
    await sql`
      CREATE TABLE IF NOT EXISTS promo_videos (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        user_id varchar NOT NULL,
        status text NOT NULL,
        config jsonb NOT NULL,
        video_url text,
        custom_voiceover_url text,
        generation_metadata jsonb,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ promo_videos table created');

    // Add foreign key for promo_videos
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'promo_videos_project_id_projects_id_fk'
        ) THEN
          ALTER TABLE promo_videos ADD CONSTRAINT promo_videos_project_id_projects_id_fk 
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `;

    // Create promo_video_scenes table
    console.log('  → Creating promo_video_scenes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS promo_video_scenes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        promo_video_id varchar NOT NULL,
        scene_index integer NOT NULL,
        description text NOT NULL,
        image_ref varchar,
        image_url text,
        created_at timestamp DEFAULT now(),
        UNIQUE(promo_video_id, scene_index)
      )
    `;
    console.log('  ✅ promo_video_scenes table created');

    // Add foreign key for promo_video_scenes
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'promo_video_scenes_promo_video_id_promo_videos_id_fk'
        ) THEN
          ALTER TABLE promo_video_scenes ADD CONSTRAINT promo_video_scenes_promo_video_id_promo_videos_id_fk 
          FOREIGN KEY (promo_video_id) REFERENCES promo_videos(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `;

    // Create promo_video_assets table
    console.log('  → Creating promo_video_assets table...');
    await sql`
      CREATE TABLE IF NOT EXISTS promo_video_assets (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        promo_video_id varchar NOT NULL,
        asset_type text NOT NULL,
        url text NOT NULL,
        metadata jsonb,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ promo_video_assets table created');

    // Add foreign key for promo_video_assets
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'promo_video_assets_promo_video_id_promo_videos_id_fk'
        ) THEN
          ALTER TABLE promo_video_assets ADD CONSTRAINT promo_video_assets_promo_video_id_promo_videos_id_fk 
          FOREIGN KEY (promo_video_id) REFERENCES promo_videos(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `;

    // Create project_likes table
    console.log('  → Creating project_likes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS project_likes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        user_id varchar NOT NULL,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('  ✅ project_likes table created');

    // Add foreign key for project_likes
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'project_likes_project_id_projects_id_fk'
        ) THEN
          ALTER TABLE project_likes ADD CONSTRAINT project_likes_project_id_projects_id_fk 
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `;

    // Create indexes
    console.log('\n  → Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS promo_videos_project_id_idx ON promo_videos(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS promo_videos_user_id_idx ON promo_videos(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS promo_video_scenes_promo_video_id_idx ON promo_video_scenes(promo_video_id)`;
    await sql`CREATE INDEX IF NOT EXISTS promo_video_assets_promo_video_id_idx ON promo_video_assets(promo_video_id)`;
    console.log('  ✅ Indexes created\n');

    // Verify tables
    console.log('🔍 Verifying tables...\n');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log(`✅ SUCCESS! Created ${tables.length} tables:\n`);
    tables.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.table_name}`);
    });

    console.log('\n================================');
    console.log('🎉 Database setup complete!');
    console.log('================================\n');

    await sql.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    await sql.end();
    process.exit(1);
  }
}

createTables();
