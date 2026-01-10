import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FileUrlProcessorService } from './file-url-processor.service';

describe('FileUrlProcessorService', () => {
  let service: FileUrlProcessorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FileUrlProcessorService]
    });
    service = TestBed.inject(FileUrlProcessorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Google Drive URL processing', () => {
    it('should process Google Drive file/d/id/view URL format', (done) => {
      const testUrl = 'https://drive.google.com/file/d/1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo/view?usp=sharing';
      const expectedDirectUrl = 'https://drive.usercontent.google.com/download?id=1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo&export=download';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(expectedDirectUrl);
        done();
      });

      const req = httpMock.expectOne(expectedDirectUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should process Google Drive open?id=id URL format', (done) => {
      const testUrl = 'https://drive.google.com/open?id=1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo';
      const expectedDirectUrl = 'https://drive.usercontent.google.com/download?id=1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo&export=download';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(expectedDirectUrl);
        done();
      });

      const req = httpMock.expectOne(expectedDirectUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should handle already converted drive.usercontent.google.com URLs', (done) => {
      const testUrl = 'https://drive.usercontent.google.com/download?id=1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo&export=download';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(testUrl);
        done();
      });

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should handle Google Drive URLs with additional parameters', (done) => {
      const testUrl = 'https://drive.google.com/file/d/1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo/view?usp=sharing&resourcekey=0-abc123';
      const expectedDirectUrl = 'https://drive.usercontent.google.com/download?id=1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo&export=download';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(expectedDirectUrl);
        done();
      });

      const req = httpMock.expectOne(expectedDirectUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should handle Google Drive URLs with different file IDs', (done) => {
      const testUrl = 'https://drive.google.com/file/d/ABC123DEF456/view';
      const expectedDirectUrl = 'https://drive.usercontent.google.com/download?id=ABC123DEF456&export=download';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(expectedDirectUrl);
        done();
      });

      const req = httpMock.expectOne(expectedDirectUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should throw error for invalid Google Drive URL', (done) => {
      const testUrl = 'https://drive.google.com/invalid-url';

      service.processFileUrl(testUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('Cannot extract file ID from Google Drive URL');
          done();
        }
      });
    });

    it('should handle network errors for Google Drive URLs', (done) => {
      const testUrl = 'https://drive.google.com/file/d/1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo/view';
      const expectedDirectUrl = 'https://drive.usercontent.google.com/download?id=1TMuTQzRH6FFy-I59QEBVWn5fUxThqSbo&export=download';

      service.processFileUrl(testUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('Network error or CORS restriction');
          done();
        }
      });

      const req = httpMock.expectOne(expectedDirectUrl);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('Dropbox URL processing', () => {
    it('should process Dropbox URLs by adding dl=1 parameter', (done) => {
      const testUrl = 'https://www.dropbox.com/s/abc123/file.gp5?dl=0';
      const expectedDirectUrl = 'https://www.dropbox.com/s/abc123/file.gp5?dl=1';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(expectedDirectUrl);
        done();
      });

      const req = httpMock.expectOne(expectedDirectUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should handle already converted Dropbox URLs', (done) => {
      const testUrl = 'https://www.dropbox.com/s/abc123/file.gp5?dl=1';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(testUrl);
        done();
      });

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });
  });

  describe('OneDrive URL processing', () => {
    it('should process OneDrive URLs by adding download=1 parameter', (done) => {
      const testUrl = 'https://1drv.ms/b/s!abc123';
      const expectedDirectUrl = 'https://1drv.ms/b/s!abc123?download=1';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(expectedDirectUrl);
        done();
      });

      const req = httpMock.expectOne(expectedDirectUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should handle already converted OneDrive URLs', (done) => {
      const testUrl = 'https://1drv.ms/b/s!abc123?download=1';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(testUrl);
        done();
      });

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });
  });

  describe('Direct URL processing', () => {
    it('should handle direct URLs by checking availability', (done) => {
      const testUrl = 'https://example.com/file.gp5';

      service.processFileUrl(testUrl).subscribe(result => {
        expect(result).toBe(testUrl);
        done();
      });

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('HEAD');
      req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should handle 404 errors for direct URLs', (done) => {
      const testUrl = 'https://example.com/nonexistent.gp5';

      service.processFileUrl(testUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('File not found at the specified URL');
          done();
        }
      });

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });

    it('should handle 403 errors for direct URLs', (done) => {
      const testUrl = 'https://example.com/restricted.gp5';

      service.processFileUrl(testUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error.message).toContain('Access denied to the file URL');
          done();
        }
      });

      const req = httpMock.expectOne(testUrl);
      req.flush(null, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('getSupportedStorageServices', () => {
    it('should return list of supported storage services', () => {
      const services = service.getSupportedStorageServices();
      expect(services).toEqual(['Google Drive', 'Dropbox', 'OneDrive', 'Direct URLs']);
    });
  });
});
