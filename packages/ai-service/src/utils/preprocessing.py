"""
Document preprocessing utilities.
Handles frontmatter extraction, content cleaning, and markdown processing.
"""

import re
import yaml
from typing import Dict, Any, Tuple, Optional
from pathlib import Path
from bs4 import BeautifulSoup
import markdown

from src.models.document import DocumentMetadata


class DocumentPreprocessor:
    """Preprocesses markdown documents for AI consumption."""
    
    def __init__(self):
        self.frontmatter_pattern = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)
        self.markdown_processor = markdown.Markdown(extensions=['codehilite', 'tables', 'toc'])
    
    def process_file(self, file_path: Path) -> Tuple[str, DocumentMetadata]:
        """
        Process a markdown file and extract content and metadata.
        
        Args:
            file_path: Path to the markdown file
            
        Returns:
            Tuple of (cleaned_content, metadata)
        """
        try:
            content = file_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            # Try with different encoding
            content = file_path.read_text(encoding='utf-8', errors='ignore')
        
        # Extract frontmatter and content
        metadata_dict, clean_content = self._extract_frontmatter(content)
        
        # Create metadata object
        metadata = self._create_metadata(metadata_dict, file_path)
        
        # Clean and normalize content
        clean_content = self._clean_content(clean_content)
        
        return clean_content, metadata
    
    def _extract_frontmatter(self, content: str) -> Tuple[Dict[str, Any], str]:
        """Extract YAML frontmatter from markdown content."""
        metadata = {}
        
        match = self.frontmatter_pattern.match(content)
        if match:
            try:
                metadata = yaml.safe_load(match.group(1)) or {}
                content = content[match.end():]
            except yaml.YAMLError:
                # Invalid YAML, ignore frontmatter
                pass
        
        return metadata, content
    
    def _create_metadata(self, metadata_dict: Dict[str, Any], file_path: Path) -> DocumentMetadata:
        """Create DocumentMetadata from extracted frontmatter."""
        
        # Extract known fields
        title = metadata_dict.get('title')
        if not title:
            # Generate title from filename
            title = file_path.stem.replace('-', ' ').replace('_', ' ').title()
        
        author = metadata_dict.get('author')
        date = metadata_dict.get('date')
        published = metadata_dict.get('published', True)
        excerpt = metadata_dict.get('excerpt')
        
        # Handle tags
        tags = metadata_dict.get('tags', [])
        if isinstance(tags, str):
            tags = [tag.strip() for tag in tags.split(',')]
        elif not isinstance(tags, list):
            tags = []
        
        # Store remaining fields as extra
        extra = {k: v for k, v in metadata_dict.items() 
                if k not in ['title', 'author', 'date', 'published', 'excerpt', 'tags']}
        
        return DocumentMetadata(
            title=title,
            author=author,
            date=date,
            published=published,
            excerpt=excerpt,
            tags=tags,
            extra=extra
        )
    
    def _clean_content(self, content: str) -> str:
        """Clean and normalize markdown content."""
        
        # Remove excessive whitespace
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        # Normalize line endings
        content = content.replace('\r\n', '\n').replace('\r', '\n')
        
        # Clean up markdown syntax that might confuse the AI
        content = self._clean_markdown_syntax(content)
        
        # Remove HTML comments
        content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
        
        return content.strip()
    
    def _clean_markdown_syntax(self, content: str) -> str:
        """Clean up markdown syntax for better AI consumption."""
        
        # Convert reference-style links to inline links
        content = self._convert_reference_links(content)
        
        # Clean up table formatting
        content = self._clean_tables(content)
        
        # Normalize code blocks
        content = self._normalize_code_blocks(content)
        
        return content
    
    def _convert_reference_links(self, content: str) -> str:
        """Convert reference-style links to inline links."""
        
        # Find all reference definitions
        ref_pattern = re.compile(r'^\[([^\]]+)\]:\s*(.+)$', re.MULTILINE)
        references = {}
        
        for match in ref_pattern.finditer(content):
            ref_id = match.group(1).lower()
            url = match.group(2).strip()
            references[ref_id] = url
        
        # Remove reference definitions
        content = ref_pattern.sub('', content)
        
        # Replace reference-style links with inline links
        link_pattern = re.compile(r'\[([^\]]+)\]\[([^\]]*)\]')
        
        def replace_link(match):
            text = match.group(1)
            ref_id = (match.group(2) or text).lower()
            url = references.get(ref_id, '#')
            return f'[{text}]({url})'
        
        content = link_pattern.sub(replace_link, content)
        
        return content
    
    def _clean_tables(self, content: str) -> str:
        """Clean up markdown table formatting."""
        
        # Find tables and ensure proper spacing
        table_pattern = re.compile(r'(\|.+\|(?:\n\|.+\|)*)', re.MULTILINE)
        
        def clean_table(match):
            table = match.group(1)
            lines = table.split('\n')
            
            # Clean each line
            cleaned_lines = []
            for line in lines:
                if '|' in line:
                    # Clean cell content
                    cells = [cell.strip() for cell in line.split('|')]
                    cleaned_line = '| ' + ' | '.join(cells[1:-1]) + ' |'
                    cleaned_lines.append(cleaned_line)
            
            return '\n'.join(cleaned_lines)
        
        return table_pattern.sub(clean_table, content)
    
    def _normalize_code_blocks(self, content: str) -> str:
        """Normalize code block formatting."""
        
        # Ensure code blocks have proper spacing
        content = re.sub(r'\n```', '\n\n```', content)
        content = re.sub(r'```\n', '```\n\n', content)
        
        # Clean up excessive newlines in code blocks
        code_block_pattern = re.compile(r'```(.*?)\n(.*?)```', re.DOTALL)
        
        def clean_code_block(match):
            language = match.group(1).strip()
            code = match.group(2)
            
            # Remove excessive leading/trailing whitespace in code
            code = code.strip('\n')
            
            return f'```{language}\n{code}\n```'
        
        return code_block_pattern.sub(clean_code_block, content)
    
    def extract_text_from_html(self, html_content: str) -> str:
        """Extract plain text from HTML content."""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text and clean it up
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text


# Global preprocessor instance
default_preprocessor = DocumentPreprocessor() 