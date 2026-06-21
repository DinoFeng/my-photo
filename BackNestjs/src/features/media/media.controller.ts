import { Controller, Get, Query } from '@nestjs/common';
import { MediaService } from './media.service.js';

@Controller('api/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  getMediaList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('fileType') fileType?: string,
    @Query('sourcePath') sourcePath?: string,
  ) {
    return this.mediaService.getList({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 30,
      search,
      fileType,
      sourcePath,
    });
  }
}