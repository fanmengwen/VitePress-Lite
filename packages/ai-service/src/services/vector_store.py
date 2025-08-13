"""
Vector store service using ChromaDB for document embeddings.
Provides similarity search and metadata filtering capabilities.
"""

import asyncio
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from chromadb.config import Settings as ChromaSettings
from loguru import logger
import uuid
from pathlib import Path

from src.config.settings import settings
from src.models.document import DocumentChunk, VectorDocument
from src.services.embedding import embedding_service


class VectorStoreService:
    """ChromaDB-based vector store for document embeddings."""
    
    def __init__(self):
        self.client: Optional[chromadb.Client] = None
        self.collection: Optional[chromadb.Collection] = None
        self._lock = asyncio.Lock()
        
    async def initialize(self) -> None:
        """Initialize ChromaDB client and collection."""
        if self.client is not None:
            return
            
        async with self._lock:
            if self.client is not None:
                return
                
            logger.info("Initializing ChromaDB vector store...")
            
            # Create data directory if it doesn't exist
            db_path = Path(settings.chromadb_path)
            db_path.mkdir(parents=True, exist_ok=True)
            
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=str(db_path),
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                )
            )
            
            # Get or create collection
            try:
                self.collection = self.client.get_collection(
                    name=settings.collection_name
                )
                logger.info(f"Using existing collection: {settings.collection_name}")
            except Exception:
                self.collection = self.client.create_collection(
                    name=settings.collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
                logger.info(f"Created new collection: {settings.collection_name}")
            
            # Log collection info
            count = self.collection.count()
            logger.info(f"Vector store initialized. Documents: {count}")
    
    async def add_documents(self, chunks: List[DocumentChunk]) -> int:
        """
        Add document chunks to the vector store.
        
        Args:
            chunks: List of document chunks to add
            
        Returns:
            Number of documents successfully added
        """
        if not chunks:
            return 0
            
        await self.initialize()
        
        logger.info(f"Adding {len(chunks)} document chunks to vector store...")
        
        # Extract texts for batch embedding
        texts = [chunk.content for chunk in chunks]
        
        # Generate embeddings
        embeddings = await embedding_service.embed_batch(texts)
        
        # Prepare data for ChromaDB
        ids = []
        metadatas = []
        documents = []
        
        for i, chunk in enumerate(chunks):
            # Generate unique ID
            doc_id = f"{chunk.chunk_id}_{uuid.uuid4().hex[:8]}"
            ids.append(doc_id)
            
            # Prepare metadata
            metadata = {
                "chunk_id": chunk.chunk_id,
                "document_path": chunk.document_path,
                "title": chunk.title,
                "chunk_index": chunk.chunk_index,
                "heading": chunk.heading or "",
                "heading_level": chunk.heading_level or 0,
                "word_count": chunk.word_count,
                "author": chunk.metadata.author or "",
                "date": chunk.metadata.date or "",
                "published": chunk.metadata.published,
                "tags": ",".join(chunk.metadata.tags),
            }
            metadatas.append(metadata)
            
            # Document content
            documents.append(chunk.content)
        
        try:
            # Add to ChromaDB
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents
            )
            
            logger.info(f"Successfully added {len(chunks)} documents to vector store")
            return len(chunks)
            
        except Exception as e:
            logger.error(f"Failed to add documents to vector store: {e}")
            return 0
    
    async def search_similar(
        self,
        query: str,
        top_k: int = None,
        metadata_filter: Optional[Dict[str, Any]] = None,
        similarity_threshold: float = None
    ) -> List[Tuple[DocumentChunk, float]]:
        """
        Search for similar documents.
        
        Args:
            query: Search query text
            top_k: Number of results to return
            metadata_filter: Optional metadata filter
            similarity_threshold: Minimum similarity score
            
        Returns:
            List of (document_chunk, similarity_score) tuples
        """
        await self.initialize()
        
        top_k = top_k or settings.retrieval_top_k
        similarity_threshold = similarity_threshold or settings.similarity_threshold
        
        # Generate query embedding
        query_embedding = await embedding_service.embed_text(query)
        
        # Prepare ChromaDB filter
        where_filter = None
        if metadata_filter:
            where_filter = metadata_filter
        
        try:
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k * 2, 100),  # Get more results to filter by threshold
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )
            
            # Process results
            similar_chunks = []
            
            for i, (doc, metadata, distance) in enumerate(zip(
                results["documents"][0],
                results["metadatas"][0], 
                results["distances"][0]
            )):
                # Convert distance to similarity (ChromaDB returns distance, not similarity)
                similarity = 1.0 - distance
                
                # Apply similarity threshold
                if similarity < similarity_threshold:
                    continue
                
                # Reconstruct DocumentChunk
                chunk = self._metadata_to_chunk(metadata, doc)
                similar_chunks.append((chunk, similarity))
                
                # Stop if we have enough results
                if len(similar_chunks) >= top_k:
                    break
            
            logger.debug(f"Found {len(similar_chunks)} similar documents for query")
            return similar_chunks
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector collection."""
        await self.initialize()
        
        try:
            count = self.collection.count()
            
            # Get sample of metadata to analyze
            if count > 0:
                sample = self.collection.get(limit=min(100, count))
                
                # Analyze metadata
                authors = set()
                titles = set()
                tags = set()
                
                for metadata in sample["metadatas"]:
                    if metadata.get("author"):
                        authors.add(metadata["author"])
                    if metadata.get("title"):
                        titles.add(metadata["title"])
                    if metadata.get("tags"):
                        tags.update(metadata["tags"].split(","))
                
                return {
                    "total_documents": count,
                    "unique_authors": len(authors),
                    "unique_titles": len(titles),
                    "unique_tags": len(tags),
                    "collection_name": settings.collection_name,
                    "embedding_dimension": embedding_service.get_dimension()
                }
            else:
                return {
                    "total_documents": 0,
                    "unique_authors": 0,
                    "unique_titles": 0,
                    "unique_tags": 0,
                    "collection_name": settings.collection_name,
                    "embedding_dimension": embedding_service.get_dimension()
                }
                
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"error": str(e)}
    
    async def delete_documents(self, document_path: str) -> int:
        """
        Delete all chunks from a specific document.
        
        Args:
            document_path: Path of the document to delete
            
        Returns:
            Number of documents deleted
        """
        await self.initialize()
        
        try:
            # Get documents with matching path
            results = self.collection.get(
                where={"document_path": document_path},
                include=["metadatas"]
            )
            
            if not results["ids"]:
                return 0
            
            # Delete documents
            self.collection.delete(ids=results["ids"])
            
            deleted_count = len(results["ids"])
            logger.info(f"Deleted {deleted_count} chunks from {document_path}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Failed to delete documents: {e}")
            return 0
    
    async def clear_collection(self) -> bool:
        """Clear all documents from the collection."""
        await self.initialize()
        
        try:
            # Get all document IDs
            all_docs = self.collection.get()
            if all_docs["ids"]:
                self.collection.delete(ids=all_docs["ids"])
            
            logger.info("Cleared all documents from vector store")
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear collection: {e}")
            return False
    
    def _metadata_to_chunk(self, metadata: Dict[str, Any], content: str) -> DocumentChunk:
        """Convert ChromaDB metadata back to DocumentChunk."""
        from src.models.document import DocumentMetadata
        
        # Reconstruct metadata
        doc_metadata = DocumentMetadata(
            title=metadata.get("title", ""),
            author=metadata.get("author") or None,
            date=metadata.get("date") or None,
            published=metadata.get("published", True),
            tags=metadata.get("tags", "").split(",") if metadata.get("tags") else []
        )
        
        # Create DocumentChunk
        return DocumentChunk(
            chunk_id=metadata["chunk_id"],
            document_path=metadata["document_path"],
            title=metadata["title"],
            content=content,
            chunk_index=metadata["chunk_index"],
            start_char=0,  # Not stored in ChromaDB
            end_char=len(content),  # Approximate
            heading=metadata.get("heading") or None,
            heading_level=metadata.get("heading_level") or None,
            metadata=doc_metadata,
            word_count=metadata.get("word_count", len(content.split()))
        )


# Global vector store instance
vector_store = VectorStoreService() 