"""
Intelligent document chunking utilities.
Respects markdown structure and maintains semantic coherence.
"""

import re
from typing import List, Tuple, Optional
from dataclasses import dataclass
from ai_service.models.document import DocumentChunk, DocumentMetadata


@dataclass
class ChunkingConfig:
    """Configuration for document chunking."""
    
    max_chunk_size: int = 1000
    chunk_overlap: int = 200
    respect_headings: bool = True
    min_chunk_size: int = 100
    preserve_code_blocks: bool = True


class MarkdownChunker:
    """Intelligent markdown chunker that preserves structure."""
    
    def __init__(self, config: ChunkingConfig = None):
        self.config = config or ChunkingConfig()
        
        # Regex patterns for markdown structure
        self.heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        self.code_block_pattern = re.compile(r'```[\s\S]*?```', re.MULTILINE)
        self.list_pattern = re.compile(r'^[-*+]\s+', re.MULTILINE)
        
    def chunk_document(
        self, 
        content: str, 
        document_path: str, 
        metadata: DocumentMetadata
    ) -> List[DocumentChunk]:
        """
        Chunk a document while preserving markdown structure.
        
        Args:
            content: Raw markdown content
            document_path: Path to source document
            metadata: Document metadata
            
        Returns:
            List of document chunks
        """
        # Remove frontmatter if present
        content = self._remove_frontmatter(content)
        
        # Split by headings if configured
        if self.config.respect_headings:
            sections = self._split_by_headings(content)
        else:
            sections = [(content, None, None)]
        
        chunks = []
        chunk_index = 0
        
        for section_content, heading, heading_level in sections:
            section_chunks = self._chunk_section(
                section_content,
                document_path,
                metadata,
                heading,
                heading_level,
                chunk_index
            )
            chunks.extend(section_chunks)
            chunk_index += len(section_chunks)
        
        return chunks
    
    def _remove_frontmatter(self, content: str) -> str:
        """Remove YAML frontmatter from content."""
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                return parts[2].strip()
        return content
    
    def _split_by_headings(self, content: str) -> List[Tuple[str, Optional[str], Optional[int]]]:
        """Split content by markdown headings."""
        sections = []
        lines = content.split('\n')
        current_section = []
        current_heading = None
        current_heading_level = None
        
        for line in lines:
            heading_match = self.heading_pattern.match(line)
            
            if heading_match:
                # Save previous section
                if current_section:
                    section_content = '\n'.join(current_section).strip()
                    if section_content:
                        sections.append((section_content, current_heading, current_heading_level))
                
                # Start new section
                current_heading = heading_match.group(2)
                current_heading_level = len(heading_match.group(1))
                current_section = [line]
            else:
                current_section.append(line)
        
        # Add final section
        if current_section:
            section_content = '\n'.join(current_section).strip()
            if section_content:
                sections.append((section_content, current_heading, current_heading_level))
        
        return sections
    
    def _chunk_section(
        self,
        content: str,
        document_path: str,
        metadata: DocumentMetadata,
        heading: Optional[str],
        heading_level: Optional[int],
        start_chunk_index: int
    ) -> List[DocumentChunk]:
        """Chunk a section of content."""
        if len(content) <= self.config.max_chunk_size:
            # Section fits in one chunk
            return [self._create_chunk(
                content,
                document_path,
                metadata,
                heading,
                heading_level,
                start_chunk_index,
                0,
                len(content)
            )]
        
        chunks = []
        start_pos = 0
        chunk_index = start_chunk_index
        
        while start_pos < len(content):
            end_pos = min(start_pos + self.config.max_chunk_size, len(content))
            
            # Adjust end position to avoid breaking words/sentences
            if end_pos < len(content):
                end_pos = self._find_good_break_point(content, start_pos, end_pos)
            
            chunk_content = content[start_pos:end_pos].strip()
            
            # Skip chunks that are too small
            if len(chunk_content) < self.config.min_chunk_size and chunk_index > start_chunk_index:
                break
            
            if chunk_content:
                chunk = self._create_chunk(
                    chunk_content,
                    document_path,
                    metadata,
                    heading,
                    heading_level,
                    chunk_index,
                    start_pos,
                    end_pos
                )
                chunks.append(chunk)
                chunk_index += 1
            
            # Move start position with overlap
            start_pos = max(start_pos + 1, end_pos - self.config.chunk_overlap)
        
        return chunks
    
    def _find_good_break_point(self, content: str, start: int, end: int) -> int:
        """Find a good break point that doesn't split words or code blocks."""
        
        # Check if we're inside a code block
        code_blocks = list(self.code_block_pattern.finditer(content))
        for match in code_blocks:
            if match.start() <= start < match.end() or match.start() <= end < match.end():
                # We're inside or crossing a code block, adjust to include the whole block
                if start < match.start():
                    return match.start()
                else:
                    return match.end()
        
        # Look for paragraph breaks (double newlines)
        search_area = content[start:end]
        paragraph_breaks = [m.start() + start for m in re.finditer(r'\n\n', search_area)]
        if paragraph_breaks:
            return paragraph_breaks[-1] + 2
        
        # Look for sentence endings
        sentence_endings = [m.start() + start for m in re.finditer(r'[.!?]\s+', search_area)]
        if sentence_endings:
            return sentence_endings[-1] + 1
        
        # Look for line breaks
        line_breaks = [m.start() + start for m in re.finditer(r'\n', search_area)]
        if line_breaks:
            return line_breaks[-1] + 1
        
        # Look for word boundaries
        word_boundaries = [m.start() + start for m in re.finditer(r'\s+', search_area)]
        if word_boundaries:
            return word_boundaries[-1]
        
        # If no good break point found, use original end
        return end
    
    def _create_chunk(
        self,
        content: str,
        document_path: str,
        metadata: DocumentMetadata,
        heading: Optional[str],
        heading_level: Optional[int],
        chunk_index: int,
        start_char: int,
        end_char: int
    ) -> DocumentChunk:
        """Create a DocumentChunk instance."""
        
        # Generate unique chunk ID
        chunk_id = f"{document_path}#{chunk_index}"
        
        # Count words
        word_count = len(content.split())
        
        return DocumentChunk(
            chunk_id=chunk_id,
            document_path=document_path,
            title=metadata.title or "Untitled Document",
            content=content,
            chunk_index=chunk_index,
            start_char=start_char,
            end_char=end_char,
            heading=heading,
            heading_level=heading_level,
            metadata=metadata,
            word_count=word_count
        )


# Global chunker instance
default_chunker = MarkdownChunker() 
