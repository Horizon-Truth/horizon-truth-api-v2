import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from '../../blogs/entities/blog.entity';
import { Resource, ResourceType } from '../../resources/entities/resource.entity';

@Injectable()
export class BlogResourceSeederService {
    private readonly logger = new Logger(BlogResourceSeederService.name);

    constructor(
        @InjectRepository(Blog)
        private readonly blogRepository: Repository<Blog>,
        @InjectRepository(Resource)
        private readonly resourceRepository: Repository<Resource>,
    ) { }

    async seed() {
        await this.seedBlogs();
        await this.seedResources();
    }

    private async seedBlogs() {
        const blogCount = await this.blogRepository.count();
        if (blogCount > 0) {
            this.logger.log('Blogs already seeded, skipping...');
            return;
        }

        const blogsData = [
            {
                title: 'The Rise of Synthetic Media: What You Need to Know',
                slug: 'the-rise-of-synthetic-media',
                excerpt: "As deepfakes and AI-generated content become more sophisticated, distinguishing truth from fiction is getting harder. Here's our guide to navigating this new reality.",
                content: `
            <p>Misinformation has taken a new, more realistic form: synthetic media. From deepfake videos of world leaders to AI-generated images of events that never happened, the digital landscape is changing rapidly.</p>
            <h3>Understanding the Technology</h3>
            <p>Generative AI models can now create highly convincing media with minimal input. While these tools have creative potential, they are also being weaponized to spread false narratives.</p>
            <blockquote>"The speed at which synthetic media is evolving outpaces our natural ability to verify it."</blockquote>
            <h3>How to Protect Yourself</h3>
            <ul>
                <li><strong>Check the source:</strong> Always verify where the media originated.</li>
                <li><strong>Look for artifacts:</strong> AI-generated images often have subtle glitches in textures or symmetry.</li>
                <li><strong>Use verification tools:</strong> Platforms like Horizon Truth offer specialized tools to flag potential deepfakes.</li>
            </ul>
        `,
                authorName: 'Sarah Chen',
                authorRole: 'AI Researcher',
                authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
                imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
                category: 'Technology',
                readTime: '6 min read',
                publishedAt: new Date('2024-05-15'),
            },
            {
                title: 'Building Community Resilience Against Fake News',
                slug: 'building-community-resilience',
                excerpt: "Misinformation isn't just a technical problem; it's a social one. Discover how local communities are coming together to verify information.",
                content: '<p>Content coming soon...</p>',
                authorName: 'Marcus Thorne',
                authorRole: 'Community Director',
                authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
                imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
                category: 'Community',
                readTime: '4 min read',
                publishedAt: new Date('2024-05-10'),
            },
        ];

        for (const blogData of blogsData) {
            const blog = this.blogRepository.create(blogData);
            await this.blogRepository.save(blog);
        }

        this.logger.log('Blogs seeded successfully');
    }

    private async seedResources() {
        const resourceCount = await this.resourceRepository.count();
        if (resourceCount > 0) {
            this.logger.log('Resources already seeded, skipping...');
            return;
        }

        const resourcesData = [
            {
                title: 'The Misinformation Handbook',
                slug: 'the-misinformation-handbook',
                type: ResourceType.GUIDE,
                description: 'Learn essential steps to verify social media posts and identify fake news effectively.',
                duration: '15 min read',
                badge: 'Most Popular',
                icon: 'FileText',
                fullContent: 'This handbook provides a step-by-step framework for verifying digital content. It covers reverse image search, source checking, and lateral reading techniques.',
            },
            {
                title: 'Solution Overview',
                slug: 'solution-overview',
                type: ResourceType.GUIDE,
                description: 'How gamified learning and crowdsource reporting combine to protect digital integrity.',
                duration: '10 min read',
                badge: 'New',
                icon: 'CheckCircle',
            },
            {
                title: 'How Fake News Spreads',
                slug: 'how-fake-news-spreads',
                type: ResourceType.VIDEO,
                description: 'A visual guide to the viral nature of misinformation across digital platforms.',
                duration: '6 min',
                icon: 'Video',
            },
            {
                title: 'Defending Truth',
                slug: 'defending-truth',
                type: ResourceType.COURSE,
                description: 'A comprehensive course on why digital honesty matters in the modern era.',
                duration: '45 min',
                icon: 'BookOpen',
            },
        ];

        for (const resourceData of resourcesData) {
            const resource = this.resourceRepository.create(resourceData);
            await this.resourceRepository.save(resource);
        }

        this.logger.log('Resources seeded successfully');
    }
}
