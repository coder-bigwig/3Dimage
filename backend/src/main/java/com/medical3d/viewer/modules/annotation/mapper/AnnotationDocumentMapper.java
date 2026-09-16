package com.medical3d.viewer.modules.annotation.mapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.UUID;

@Mapper
public interface AnnotationDocumentMapper {
    String find(@Param("resultId") UUID resultId);
    int save(@Param("resultId") UUID resultId, @Param("content") String content, @Param("version") int version);
}
