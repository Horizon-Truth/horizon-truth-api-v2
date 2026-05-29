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